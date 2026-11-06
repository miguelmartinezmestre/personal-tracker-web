import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { ERROR_CODES } from './shared/errorCodes';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import {
    currentSessionId,
    listSessionsForUser,
    recoverActorSessionsBatch,
    removeSession,
    revokeOtherSessionsBatch,
} from './features/auth/sessions';
import { sessionListItemValidator } from './features/auth/validators';
import { insertAuditLog } from './features/audit/log';

export const listMySessions = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(sessionListItemValidator),
    handler: async (ctx, args) => {
        return await listSessionsForUser(ctx, {
            userId: ctx.userId,
            currentSessionId: await currentSessionId(ctx),
            paginationOpts: args.paginationOpts,
        });
    },
});

export const revokeSession = mutationWithRLS({
    args: { sessionId: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        const revoked = await removeSession(ctx, args.sessionId, ctx.userId);

        if (!revoked) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await insertAuditLog(ctx, {
            action: 'session.revoked',
            resourceType: 'session',
            resourceId: revoked.id,
            userId: ctx.userId,
            severity: 'warning',
        });

        return null;
    },
});

export const revokeOtherSessions = mutationWithRLS({
    args: {},
    returns: v.object({ revokedCount: v.number() }),
    handler: async ctx => {
        const keepSessionId = await currentSessionId(ctx);

        const revokedCount = await revokeOtherSessionsBatch(ctx, {
            userId: ctx.userId,
            keepSessionId,
        });

        await insertAuditLog(ctx, {
            action: 'session.revoked_others',
            resourceType: 'session',
            userId: ctx.userId,
            severity: 'warning',
            metadata: { after: { revokedCount } },
        });

        return { revokedCount };
    },
});

export const continueSessionRevocation = internalMutation({
    args: { userId: v.string(), keepSessionId: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        await revokeOtherSessionsBatch(ctx, args);

        return null;
    },
});

/**
 * Runs from Better Auth's afterDeleteOrganization hook: moves the actor's sessions off the deleted
 * organization in batches, scheduling itself until the walk is done.
 */
export const recoverAfterOrganizationDeletion = internalMutation({
    args: {
        organizationId: v.string(),
        actorUserId: v.string(),
        phase: v.optional(v.union(v.literal('actor-cleared'), v.literal('actor-deleted'))),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const next = await recoverActorSessionsBatch(ctx, {
            organizationId: args.organizationId,
            actorUserId: args.actorUserId,
            step: { phase: args.phase ?? 'actor-cleared', cursor: args.cursor ?? null },
        });

        if (next) {
            await ctx.scheduler.runAfter(0, internal.sessions.recoverAfterOrganizationDeletion, {
                organizationId: args.organizationId,
                actorUserId: args.actorUserId,
                ...next,
            });
        }

        return null;
    },
});
