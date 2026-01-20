import { mutation } from './_generated/server';
import { authComponent } from './auth';
import { components } from './_generated/api';

export const promoteSelfToAdmin = mutation({
    args: {},
    handler: async ctx => {
        if (process.env.ALLOW_PROMOTE_DEV !== 'true') {
            throw new Error('Promote admin disabled');
        }

        const user = await ctx.auth.getUserIdentity().catch(() => null);
        if (!user || !user._id) {
            throw new Error('Unauthorized');
        }

        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: user._id }],
                update: {
                    role: 'admin',
                },
            },
        });

        return { userId: user._id };
    },
});
