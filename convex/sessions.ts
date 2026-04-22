import { v, ConvexError } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';
import { mutation } from './_generated/server';
import { getAuth } from './auth';
import { getHeaders, getSession, getAuthUserIdentity } from 'better-convex/auth';
import { ERROR_CODES } from './utils/constants';

export const getSessionsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const currentSession = await getSession(ctx);

        const paginatedSessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', currentSession?.userId as string))
            .order('desc')
            .paginate(args.paginationOpts);

        return {
            currentSession,
            ...paginatedSessions,
        };
    },
});

export const invalidateSession = mutationWithRLS({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        await auth.api.revokeSession({
            headers,
            body: {
                token: args.token,
            },
        });

        return { success: true } as const;
    },
});

// Use a plain `mutation` (not `mutationWithRLS`) so we can delete session
// rows directly even though RLS forbids regular users from writing to the
// `session` table. We enforce ownership manually: only the currently
// authenticated user's session rows can be deleted. Using the RLS-wrapped
// mutation made deletes silently fail, leaving ghost sessions in the table.
export const invalidateAllOtherSessions = mutation({
    args: { currentToken: v.string() },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId as string))
            .collect();

        let revokedCount = 0;
        for (const session of sessions) {
            if (session.token !== args.currentToken) {
                await ctx.db.delete(session._id);
                revokedCount++;
            }
        }

        return { success: true, revokedCount } as const;
    },
});
