import { mutation } from './_generated/server';
import { components } from './_generated/api';

export const promoteSelfToAdmin = mutation({
    args: {},
    handler: async ctx => {
        if (process.env.ALLOW_PROMOTE_DEV !== 'true') {
            throw new Error('Promote admin disabled');
        }

        const user = await ctx.auth.getUserIdentity().catch(() => null);

        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: String(user?.subject) }],
                update: {
                    role: 'admin',
                },
            },
        });

        return { userId: String(user?.subject) };
    },
});
