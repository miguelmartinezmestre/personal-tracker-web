import type { MutationCtx } from './_generated/server';
import type { Triggers as BetterAuthTriggers } from 'kitcn/auth';
import type schema from './schema';
import type { DataModel, Id } from './_generated/dataModel';

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
    'name',
    'emailVerified',
    'createdAt',
    'updatedAt',
    'role',
    'banned',
    'banReason',
    'banExpires',
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

const toAuditPrimitive = (value: unknown): string | number | boolean | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;

    if (typeof value === 'object') {
        if (typeof (value as { _id?: unknown })._id === 'string') {
            return (value as { _id: string })._id;
        }
        return String(value);
    }
    return String(value);
};

const sanitizeSession = (
    session: Record<string, unknown>
): Record<string, string | number | boolean | null> => {
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(session)) {
        if (ALLOWED_SESSION_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(session[key]);
        }
    }
    return result;
};

const sanitizeUser = (
    user: Record<string, unknown>
): Record<string, string | number | boolean | null> => {
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(user)) {
        if (ALLOWED_USER_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(user[key]);
        }
    }
    return result;
};

const sanitizeInvitation = (
    invitation: Record<string, unknown>
): Record<string, string | number | boolean | null> => {
    const result: Record<string, string | number | boolean | null> = {};
    for (const key of Object.keys(invitation)) {
        if (ALLOWED_INVITATION_FIELDS.has(key)) {
            result[key] = toAuditPrimitive(invitation[key]);
        }
    }
    return result;
};

const resolveOrganizationId = async (
    ctx: MutationCtx,
    explicitOrganizationId?: string | null,
    fallbackUserId?: string | null
): Promise<Id<'organization'> | null> => {
    if (explicitOrganizationId) {
        const normalized = ctx.db.normalizeId('organization', explicitOrganizationId);
        if (normalized) {
            return normalized;
        }
    }

    if (fallbackUserId) {
        const normalizedUserId = ctx.db.normalizeId('user', fallbackUserId);
        if (!normalizedUserId) {
            return null;
        }

        const membership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', normalizedUserId))
            .first();

        if (membership?.organizationId) {
            const normalized = ctx.db.normalizeId('organization', membership.organizationId);
            if (normalized) {
                return normalized;
            }
        }
    }

    return null;
};

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
    const organizationId = await resolveOrganizationId(ctx, args.organizationId, args.userId);
    const normalizedUserId = ctx.db.normalizeId('user', args.userId);

    if (!organizationId || !normalizedUserId) {
        return;
    }

    let metadata: AuthAuditMetadata | undefined;

    if (args.metadata !== undefined) {
        const metadataSource = args.metadata;
        const normalizedMetadata: AuthAuditMetadata = {};
        if (metadataSource.before !== undefined) {
            normalizedMetadata.before = metadataSource.before;
        }
        if (metadataSource.after !== undefined) {
            normalizedMetadata.after = metadataSource.after;
        }
        if (metadataSource.context !== undefined) {
            normalizedMetadata.context = metadataSource.context;
        }
        metadata = Object.keys(normalizedMetadata).length > 0 ? normalizedMetadata : undefined;
    }

    await ctx.db.insert('auditLogs', {
        userId: normalizedUserId,
        organizationId,
        action: args.action,
        resourceType: args.resourceType,
        resourceId: args.resourceId ?? undefined,
        metadata,
        severity: 'info',
        createdAt: Date.now(),
    });
};

export const authAuditTriggers: BetterAuthTriggers<DataModel, BetterAuthSchema, MutationCtx> = {
    session: {
        change: async (change, ctx) => {
            if (change.operation === 'insert') {
                await insertAuthAuditLog(ctx, {
                    action: 'session.created',
                    resourceType: 'session',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.userId,
                    organizationId: change.newDoc.activeOrganizationId ?? null,
                    metadata: { after: sanitizeSession(change.newDoc) },
                });
            }

            if (change.operation === 'delete') {
                await insertAuthAuditLog(ctx, {
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
            if (change.operation === 'insert') {
                await insertAuthAuditLog(ctx, {
                    action: 'invitation.created',
                    resourceType: 'invitation',
                    resourceId: change.newDoc._id,
                    userId: change.newDoc.inviterId,
                    organizationId: change.newDoc.organizationId,
                    metadata: { after: sanitizeInvitation(change.newDoc) },
                });
            }

            if (change.operation === 'update') {
                await insertAuthAuditLog(ctx, {
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
                await insertAuthAuditLog(ctx, {
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
            if (change.operation === 'update') {
                await insertAuthAuditLog(ctx, {
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
                await insertAuthAuditLog(ctx, {
                    action: 'user.deleted',
                    resourceType: 'user',
                    resourceId: change.oldDoc._id,
                    userId: change.oldDoc._id,
                    metadata: { before: sanitizeUser(change.oldDoc) },
                });
            }
        },
    },
};
