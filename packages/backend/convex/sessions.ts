import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS, BetterAuthDataModel } from './rls';
import { authComponent } from './auth';
import { components } from './_generated/api';

export const getSessionsByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
        if (!user || !user._id) throw new Error('User not authenticated');
        const userId = user.userId || String(user._id);
        return (await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "session",
              where: [{ field: "userId", value: userId }],
              paginationOpts: {
                cursor: null,
                numItems: 10,
              },
            }
        )) as BetterAuthDataModel["session"]["document"][];
    },
});

export const invalidateSession = mutationWithRLS({
    args: { _id: v.id('session') },
    handler: async (ctx, args) => {
        await ctx.runMutation(
            components.betterAuth.adapter.updateOne,
            {
              input: {
                model: "session",
                update: { updatedAt: Date.now() },
                where: [{ field: "_id", value: args._id }],
              },
            }
        );
        return { message: 'Session invalidated' } as const;
    },
});
