import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { getAuthenticatedUser } from './auth';

export const getSessionsByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new Error('User not authenticated');
        const userId = user.userId || String(user._id);
        return await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', userId))
            .collect();
    },
});

export const invalidateSession = mutationWithRLS({
    args: { _id: v.id('session') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args._id, { updatedAt: Date.now() });
        return { message: 'Session invalidated' } as const;
    },
});
