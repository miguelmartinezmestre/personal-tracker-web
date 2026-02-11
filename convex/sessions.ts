import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';
import { getAuth } from './auth';
import { getHeaders, getSession } from 'better-convex/auth';

export const getSessionsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async ctx => {
        const currentSession = await getSession(ctx);

        console.log(currentSession);

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', currentSession?.userId as string))
            .collect();

        return {
            currentSession,
            sessions,
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

        return { message: 'Session invalidated' } as const;
    },
});

export const invalidateAllOtherSessions = mutationWithRLS({
    args: { currentToken: v.string() },
    handler: async (ctx, args) => {
        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        const sessions = await auth.api.listSessions({ headers });

        let revokedCount = 0;
        for (const session of sessions) {
            if (session.token !== args.currentToken) {
                await auth.api.revokeSession({
                    headers,
                    body: {
                        token: session.token,
                    },
                });
                revokedCount++;
            }
        }

        return { message: 'All other sessions invalidated', revokedCount } as const;
    },
});
