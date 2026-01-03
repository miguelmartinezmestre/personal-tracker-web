import { queryWithRLS, mutationWithRLS } from './rls';
import { ConvexError, v } from 'convex/values';
import { getAuthenticatedUser } from './auth';

export const getUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user) {
            return null;
        }
        return user.userId || String(user._id);
    },
});

export const getAccountDetails = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user) throw new ConvexError('Unauthorized');
        return {
            email: user.email ?? '',
            username: user.name ?? '',
        };
    },
});

export const getUserRole = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) return null;

        // Buscar el usuario en la tabla user de betterAuth para obtener el rol
        const userId = user.userId || String(user._id);
        const userRecord = await ctx.db
            .query('user')
            .withIndex('userId', q => q.eq('userId', userId))
            .first();

        if (!userRecord) return null;

        return {
            role: ((userRecord as Record<string, unknown>)?.role as string | null) || null,
            userId: userId,
        };
    },
});

export const updateAccountDetails = mutationWithRLS({
    args: {
        email: v.string(),
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new ConvexError('Unauthorized');

        // Buscar el usuario por userId
        const userId = user.userId || String(user._id);
        const userRecord = await ctx.db
            .query('user')
            .withIndex('userId', q => q.eq('userId', userId))
            .first();

        if (!userRecord) throw new ConvexError('User not found');

        // IMPORTANT:
        // Do NOT change email directly in the database.
        // Email changes must go through Better Auth's `changeEmail` flow (with verification).
        if (args.email !== userRecord.email) {
            throw new ConvexError(
                'Email changes require verification. Use Better Auth `changeEmail` flow instead.'
            );
        }

        await ctx.db.patch(userRecord._id, {
            name: args.username,
            updatedAt: Date.now(),
        });
        return { message: 'Account details updated', error: false } as const;
    },
});
