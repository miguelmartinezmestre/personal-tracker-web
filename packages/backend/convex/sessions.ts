import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';
import { authComponent, createAuth } from './auth';

export const getSessionsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx) => {

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

        const sessions = await auth.api.listSessions({
            headers,
        });

        return sessions;
    },
});

export const invalidateSession = mutationWithRLS({
    args: { token: v.string() },
    handler: async (ctx, args) => {

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

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

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

        const sessions = await auth.api.listSessions({ headers });

        let revokedCount = 0;
        for (const session of sessions) {
            // betterAuth sessions use 'token' as the identifier
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
