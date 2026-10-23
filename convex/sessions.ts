import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { currentSessionId, revokeOtherSessionsBatch } from './features/auth/sessions';
import { sessionListItemValidator } from './features/auth/validators';

export const listMySessions = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(sessionListItemValidator),
    handler: async (ctx, args) => {
        const currentId = await currentSessionId(ctx);

        const result = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', ctx.userId))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'session',
                index: 'userId',
                prefix: [ctx.userId],
                indexKey: doc => [doc.userId],
                paginationOpts: args.paginationOpts,
            },
            result,
            result.page.map(session => ({
                id: session._id,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress ?? null,
                userAgent: session.userAgent ?? null,
                isCurrent: session._id === currentId,
            }))
        );
    },
});

export const revokeSession = mutationWithRLS({
    args: { sessionId: v.id('session') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const session = await ctx.db.get('session', args.sessionId);

        if (!session || session.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.db.delete('session', args.sessionId);

        return null;
    },
});

// Signs out everywhere else, 100 sessions per transaction (INH-AUT-10).
export const revokeOtherSessions = mutationWithRLS({
    args: {},
    returns: v.object({ revokedCount: v.number() }),
    handler: async ctx => {
        const keepSessionId = await currentSessionId(ctx);

        return {
            revokedCount: await revokeOtherSessionsBatch(ctx, {
                userId: ctx.userId,
                keepSessionId,
            }),
        };
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
