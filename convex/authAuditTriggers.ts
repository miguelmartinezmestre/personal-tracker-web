import type { MutationCtx } from './_generated/server';
import { getAuthUserId, type Triggers as BetterAuthTriggers } from 'kitcn/auth';
import { requireMutationCtx, type GenericCtx } from './platform/auth/authRuntime';
import type schema from './schema';
import type { DataModel, Id } from './_generated/dataModel';
import {
    resolveActorUserId,
    sanitizeAuditMetadata,
    toAuditPrimitive,
} from './domain/audit/privacy';
import { startMemberLeaveCleanup } from './jobs/organizations/memberLeaveCleanup';
import { isJsonObject, type JsonObject } from './utils/json';

type BetterAuthSchema = typeof schema;

const ALLOWED_SESSION_FIELDS = new Set([
    '_id',
    'userId',
    'activeOrganizationId',
    'expiresAt',
    'createdAt',
    'updatedAt',
]);

const ALLOWED_USER_FIELDS = new Set([
    '_id',
    'emailVerified',
    'createdAt',
    'updatedAt',
    'role',
    'banned',
    'banExpires',
    'deletedAt',
]);

const ALLOWED_INVITATION_FIELDS = new Set([
    '_id',
    'organizationId',
    'role',
    'status',
    'expiresAt',
    'createdAt',
    'inviterId',
]);

const sanitizeSession = (session: object): Record<string, string | number | boolean | null> => {
    if (!isJsonObject(session)) {
        return {};
    }
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(session)) {
        if (ALLOWED_SESSION_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(session[key]);
        }
    }
    return result;
};

const sanitizeUser = (user: object): Record<string, string | number | boolean | null> => {
    if (!isJsonObject(user)) {
        return {};
    }
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(user)) {
        if (ALLOWED_USER_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(user[key]);
        }
    }
    return result;
};

const sanitizeInvitation = (
    invitation: object
): Record<string, string | number | boolean | null> => {
    if (!isJsonObject(invitation)) {
        return {};
    }
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(invitation)) {
        if (ALLOWED_INVITATION_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(invitation[key]);
        }
    }
    return result;
};

type AuthAuditMetadata = {
    before?: Record<string, string | number | boolean | null>;
    after?: Record<string, string | number | boolean | null>;
    context?: string;
};

const isAuditRecord = (
    value: JsonObject | object | string | number | boolean | null | undefined
): value is Record<string, string | number | boolean | null> => {
    return isJsonObject(value);
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
    const normalizedActorUserId = rawActorUserId
        ? (ctx.db.normalizeId('user', rawActorUserId) ?? undefined)
        : undefined;
    const actorUserId = resolveActorUserId(normalizedUserId, normalizedActorUserId);

    let metadata: AuthAuditMetadata | undefined;

    if (args.metadata !== undefined) {
        const metadataSource = sanitizeAuditMetadata(args.resourceType, args.metadata);
        const normalizedMetadata: AuthAuditMetadata = {};
        if (isAuditRecord(metadataSource?.before)) {
            normalizedMetadata.before = metadataSource.before;
        }
        if (isAuditRecord(metadataSource?.after)) {
            normalizedMetadata.after = metadataSource.after;
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
                const organizationId = mutationCtx.db.normalizeId(
                    'organization',
                    change.oldDoc.organizationId
                );
                const userId = mutationCtx.db.normalizeId('user', change.oldDoc.userId);
                if (organizationId && userId) {
                    await startMemberLeaveCleanup(mutationCtx, organizationId, userId);
                }

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
