import type { MutationCtx } from './_generated/server';
import type { Triggers as BetterAuthTriggers } from '@convex-dev/better-auth';
import type schema from './schema';
import type { DataModel, Id } from './_generated/dataModel';

type BetterAuthSchema = typeof schema;

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
        const membership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', fallbackUserId))
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

const insertAuthAuditLog = async (
    ctx: MutationCtx,
    args: {
        action: string;
        resourceType: string;
        resourceId?: string | null;
        userId: string;
        organizationId?: string | null;
        metadata?: {
            before?: unknown;
            after?: unknown;
            context?: string;
        };
    }
) => {
    const organizationId = await resolveOrganizationId(ctx, args.organizationId, args.userId);
    const normalizedUserId = ctx.db.normalizeId('user', args.userId);

    if (!organizationId || !normalizedUserId) {
        return;
    }

    await ctx.db.insert('auditLogs', {
        userId: normalizedUserId,
        organizationId,
        action: args.action,
        resourceType: args.resourceType,
        resourceId: args.resourceId ?? undefined,
        metadata: args.metadata,
        severity: 'info',
        createdAt: Date.now(),
    });
};

export const authAuditTriggers: BetterAuthTriggers<DataModel, BetterAuthSchema> = {
    session: {
        onCreate: async (ctx, doc) => {
            await insertAuthAuditLog(ctx, {
                action: 'session.created',
                resourceType: 'session',
                resourceId: doc._id,
                userId: doc.userId,
                organizationId: doc.activeOrganizationId ?? null,
                metadata: { after: doc },
            });
        },
        onDelete: async (ctx, doc) => {
            await insertAuthAuditLog(ctx, {
                action: 'session.deleted',
                resourceType: 'session',
                resourceId: doc._id,
                userId: doc.userId,
                organizationId: doc.activeOrganizationId ?? null,
                metadata: { before: doc },
            });
        },
    },
    invitation: {
        onCreate: async (ctx, doc) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.created',
                resourceType: 'invitation',
                resourceId: doc._id,
                userId: doc.inviterId,
                organizationId: doc.organizationId,
                metadata: { after: doc },
            });
        },
        onUpdate: async (ctx, newDoc, oldDoc) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.updated',
                resourceType: 'invitation',
                resourceId: newDoc._id,
                userId: newDoc.inviterId,
                organizationId: newDoc.organizationId,
                metadata: { before: oldDoc, after: newDoc },
            });
        },
        onDelete: async (ctx, doc) => {
            await insertAuthAuditLog(ctx, {
                action: 'invitation.deleted',
                resourceType: 'invitation',
                resourceId: doc._id,
                userId: doc.inviterId,
                organizationId: doc.organizationId,
                metadata: { before: doc },
            });
        },
    },
    user: {
        onUpdate: async (ctx, newDoc, oldDoc) => {
            await insertAuthAuditLog(ctx, {
                action: 'user.updated',
                resourceType: 'user',
                resourceId: newDoc._id,
                userId: newDoc._id,
                metadata: { before: oldDoc, after: newDoc },
            });
        },
        onDelete: async (ctx, doc) => {
            await insertAuthAuditLog(ctx, {
                action: 'user.deleted',
                resourceType: 'user',
                resourceId: doc._id,
                userId: doc._id,
                metadata: { before: doc },
            });
        },
    },
};
