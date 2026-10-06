import type { MutationCtx } from './_generated/server';
import { getAuthUserId, type Triggers as BetterAuthTriggers } from 'kitcn/auth';
import { requireMutationCtx, type GenericCtx } from './utils';
import type schema from './schema';
import type { DataModel, Id } from './_generated/dataModel';
import { resolveActorUserId, sanitizeAuditMetadata, toAuditPrimitive } from './auditPrivacy';
import { z } from 'zod';

type BetterAuthSchema = typeof schema;

const auditPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const auditReferenceSchema = z.looseObject({ _id: z.string() });
const auditFieldSchema = z
    .union([
        auditPrimitiveSchema.transform(toAuditPrimitive),
        auditReferenceSchema.transform(reference => reference._id),
    ])
    .optional()
    .catch(undefined);
const auditRecordSchema = z.record(z.string(), auditPrimitiveSchema);
const sessionAuditSourceSchema = z
    .object({
        _id: auditFieldSchema,
        userId: auditFieldSchema,
        activeOrganizationId: auditFieldSchema,
        expiresAt: auditFieldSchema,
        createdAt: auditFieldSchema,
        updatedAt: auditFieldSchema,
    })
    .transform(toAuditRecord);
const userAuditSourceSchema = z
    .object({
        _id: auditFieldSchema,
        emailVerified: auditFieldSchema,
        createdAt: auditFieldSchema,
        updatedAt: auditFieldSchema,
        role: auditFieldSchema,
        banned: auditFieldSchema,
        banExpires: auditFieldSchema,
        deletedAt: auditFieldSchema,
    })
    .transform(toAuditRecord);
const invitationAuditSourceSchema = z
    .object({
        _id: auditFieldSchema,
        organizationId: auditFieldSchema,
        role: auditFieldSchema,
        status: auditFieldSchema,
        expiresAt: auditFieldSchema,
        createdAt: auditFieldSchema,
        inviterId: auditFieldSchema,
    })
    .transform(toAuditRecord);

type AuditRecord = Record<string, string | number | boolean | null>;

function toAuditRecord(
    fields: Record<string, string | number | boolean | null | undefined>
): AuditRecord {
    const record: AuditRecord = {};
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            record[key] = value;
        }
    }
    return record;
}

const sanitizeAuditSource = (schema: z.ZodType<AuditRecord>, source: object): AuditRecord => {
    const result = schema.safeParse(source);
    return result.success ? result.data : {};
};

const sanitizeSession = (session: object): AuditRecord =>
    sanitizeAuditSource(sessionAuditSourceSchema, session);

const sanitizeUser = (user: object): AuditRecord =>
    sanitizeAuditSource(userAuditSourceSchema, user);

const sanitizeInvitation = (invitation: object): AuditRecord =>
    sanitizeAuditSource(invitationAuditSourceSchema, invitation);

type AuthAuditMetadata = {
    before?: Record<string, string | number | boolean | null>;
    after?: Record<string, string | number | boolean | null>;
    context?: string;
};

const insertAuthAuditLog = async (
    ctx: MutationCtx,
    args: {
        action: string;
        resourceType: string;
        resourceId?: string | null;
        userId: string;
        organizationId?: string | null;
        metadata?: {
            before?: Record<string, string | number | boolean | null>;
            after?: Record<string, string | number | boolean | null>;
            context?: string;
        };
    }
) => {
    let organizationId: Id<'organization'> | null = null;
    if (args.organizationId) {
        organizationId = ctx.db.normalizeId('organization', args.organizationId);
    }

    if (!organizationId && args.userId) {
        const fallbackUserId = ctx.db.normalizeId('user', args.userId);
        if (fallbackUserId) {
            const membership = await ctx.db
                .query('member')
                .withIndex('userId', q => q.eq('userId', fallbackUserId))
                .first();

            if (membership?.organizationId) {
                organizationId = ctx.db.normalizeId('organization', membership.organizationId);
            }
        }
    }

    const normalizedUserId = ctx.db.normalizeId('user', args.userId);

    if (!organizationId || !normalizedUserId) {
        return;
    }

    const rawActorUserId = await getAuthUserId(ctx);
    let normalizedActorUserId: Id<'user'> | undefined;
    if (rawActorUserId) {
        normalizedActorUserId = ctx.db.normalizeId('user', rawActorUserId) ?? undefined;
    } else {
        normalizedActorUserId = undefined;
    }
    const actorUserId = resolveActorUserId(normalizedUserId, normalizedActorUserId);

    let metadata: AuthAuditMetadata | undefined;

    if (args.metadata !== undefined) {
        const metadataSource = sanitizeAuditMetadata(args.resourceType, args.metadata);
        const normalizedMetadata: AuthAuditMetadata = {};
        const before = auditRecordSchema.safeParse(metadataSource?.before);
        if (before.success) {
            normalizedMetadata.before = before.data;
        }
        const after = auditRecordSchema.safeParse(metadataSource?.after);
        if (after.success) {
            normalizedMetadata.after = after.data;
        }
        if (metadataSource?.context !== undefined) {
            normalizedMetadata.context = metadataSource.context;
        }
        metadata = Object.keys(normalizedMetadata).length > 0 ? normalizedMetadata : undefined;
    }

    await ctx.db.insert('auditLogs', {
        userId: normalizedUserId,
        actorUserId,
        organizationId,
        action: args.action,
        resourceType: args.resourceType,
        resourceId: args.resourceId ?? undefined,
        metadata,
        createdAt: Date.now(),
    });
};

export const authAuditTriggers: BetterAuthTriggers<DataModel, BetterAuthSchema, GenericCtx> = {
    session: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);
            if (change.operation === 'insert') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'session.created',
                    resourceType: 'session',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.userId,
                    organizationId: change.newDoc.activeOrganizationId ?? null,
                    metadata: { after: sanitizeSession(change.newDoc) },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'session.deleted',
                    resourceType: 'session',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.userId,
                    organizationId: change.oldDoc.activeOrganizationId ?? null,
                    metadata: { before: sanitizeSession(change.oldDoc) },
                });
            }
        },
    },
    invitation: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);
            if (change.operation === 'insert') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.created',
                    resourceType: 'invitation',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.inviterId,
                    organizationId: change.newDoc.organizationId,
                    metadata: { after: sanitizeInvitation(change.newDoc) },
                });
            }

            if (change.operation === 'update') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.updated',
                    resourceType: 'invitation',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.inviterId,
                    organizationId: change.newDoc.organizationId,
                    metadata: {
                        before: sanitizeInvitation(change.oldDoc),
                        after: sanitizeInvitation(change.newDoc),
                    },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'invitation.deleted',
                    resourceType: 'invitation',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.inviterId,
                    organizationId: change.oldDoc.organizationId,
                    metadata: { before: sanitizeInvitation(change.oldDoc) },
                });
            }
        },
    },
    user: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);
            if (change.operation === 'update') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'user.updated',
                    resourceType: 'user',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc._id,
                    metadata: {
                        before: sanitizeUser(change.oldDoc),
                        after: sanitizeUser(change.newDoc),
                    },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(mutationCtx, {
                    action: 'user.deleted',
                    resourceType: 'user',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc._id,
                    metadata: { before: sanitizeUser(change.oldDoc) },
                });
            }
        },
    },
    member: {
        change: async (change, ctx) => {
            const mutationCtx = requireMutationCtx(ctx);
            if (change.operation === 'delete') {
                const oldDoc = change.oldDoc;
                const sanitizedMember: Record<string, string | number | boolean | null> = {
                    _id: toAuditPrimitive(oldDoc._id),
                    organizationId: toAuditPrimitive(oldDoc.organizationId),
                    userId: toAuditPrimitive(oldDoc.userId),
                    role: toAuditPrimitive(oldDoc.role),
                    createdAt: toAuditPrimitive(oldDoc.createdAt),
                };

                await insertAuthAuditLog(mutationCtx, {
                    action: 'organization_member.deleted',
                    resourceType: 'organization_member',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.userId,
                    organizationId: change.oldDoc.organizationId,
                    metadata: { before: sanitizedMember },
                });
            }
        },
    },
};
