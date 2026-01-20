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
    args: { _id: v.id('session') },
    handler: async (ctx, args) => {

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

        await auth.api.revokeSession({
            headers,
            body: {
                token: args._id,
            },
        });

        return { message: 'Session invalidated' } as const;
    },
});
