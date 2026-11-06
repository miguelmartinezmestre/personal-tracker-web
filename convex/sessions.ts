import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import {
    currentSessionId,
    listSessionsForUser,
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
    args: { sessionId: v.id('session') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const removed = await removeSession(ctx, args.sessionId, ctx.userId);

        if (!removed) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await insertAuditLog(ctx, {
            action: 'session.revoked',
            resourceType: 'session',
            resourceId: removed.id,
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
    args: { userId: v.id('user'), keepSessionId: v.id('session') },
    returns: v.null(),
    handler: async (ctx, args) => {
        await revokeOtherSessionsBatch(ctx, args);

        return null;
    },
});
