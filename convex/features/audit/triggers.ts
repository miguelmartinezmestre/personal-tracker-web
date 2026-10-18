import type { MutationCtx } from '../../_generated/server';
import { getAuthUserId, type Triggers as BetterAuthTriggers } from 'kitcn/auth';
import { requireMutationCtx, type GenericCtx } from '../../shared/ctx';
import type schema from '../../schema';
import type { DataModel, Doc, Id } from '../../_generated/dataModel';
import { resolveActorUserId } from './privacy';

type BetterAuthSchema = typeof schema;

// Allowlisted IDs, enums, numbers and flags only: free text and personal data never reach the log.
type AuditRecord = Record<string, string | number | boolean | null>;

const sanitizeSession = (session: Doc<'session'>) =>
    ({
        _id: session._id,
        userId: session.userId,
        activeOrganizationId: session.activeOrganizationId ?? null,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    }) satisfies AuditRecord;

const sanitizeUser = (user: Doc<'user'>) =>
    ({
        _id: user._id,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role ?? null,
        banned: user.banned ?? null,
        banExpires: user.banExpires ?? null,
        deletedAt: user.deletedAt ?? null,
    }) satisfies AuditRecord;

const sanitizeInvitation = (invitation: Doc<'invitation'>) =>
    ({
        _id: invitation._id,
        organizationId: invitation.organizationId,
        role: invitation.role ?? null,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        inviterId: invitation.inviterId,
    }) satisfies AuditRecord;

const sanitizeMember = (member: Doc<'member'>) =>
    ({
        _id: member._id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
    }) satisfies AuditRecord;

const insertAuthAuditLog = async (
    ctx: MutationCtx,
    args: {
        action: string;
        resourceType: string;
        resourceId?: string | null;
        userId: string;
        organizationId?: string | null;
        // Already reduced to allowlisted, redacted fields by the sanitize* helpers above.
        metadata?: { before?: AuditRecord; after?: AuditRecord };
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

    const { before, after } = args.metadata ?? {};

    await ctx.db.insert('auditLogs', {
        userId: normalizedUserId,
        actorUserId,
        organizationId,
        action: args.action,
        resourceType: args.resourceType,
        resourceId: args.resourceId ?? undefined,
        metadata: before || after ? { before, after } : undefined,
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
                await insertAuthAuditLog(mutationCtx, {
                    action: 'organization_member.deleted',
                    resourceType: 'organization_member',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc.userId,
                    organizationId: change.oldDoc.organizationId,
                    metadata: { before: sanitizeMember(change.oldDoc) },
                });
            }
        },
    },
};
