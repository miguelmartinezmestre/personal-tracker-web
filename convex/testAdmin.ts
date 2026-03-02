import { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';

export const promoteSelfToAdmin = mutation({
    args: {},
    handler: async ctx => {
        if (process.env.ALLOW_PROMOTE_DEV !== 'true') {
            throw new Error('Promote admin disabled');
        }

        const user = await ctx.auth.getUserIdentity().catch(() => null);

        await ctx.db.patch('user', String(user?.subject) as Id<'user'>, {
            role: 'admin',
        });

        return { userId: String(user?.subject) };
    },
});
