import { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';

export const promoteSelfToAdmin = mutation({
    args: {},
    handler: async ctx => {
        if (process.env.ALLOW_PROMOTE_DEV !== 'true') {
            throw new Error('Promote admin disabled');
        }

        const user = await ctx.auth.getUserIdentity().catch(() => null);

        const userId = user?.subject as Id<'user'>;
        await ctx.db.patch('user', userId, {
            role: 'admin',
        });

        return { userId };
    },
});
