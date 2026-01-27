import { v } from 'convex/values';
import { getAuth } from './auth';
import { GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { requireAdmin } from './utils/requiredAdmin';
import { mutationWithRLS, queryWithRLS } from './rls';
import { getHeaders } from 'better-convex/auth';
import { DataModel } from './_generated/dataModel';

export const listUsers = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        searchValue: v.optional(v.string()),
    },
    handler: async (ctx, args) => {

        await requireAdmin(ctx as unknown as GenericMutationCtx<DataModel>);

        // Get all users from BetterAuth user table with pagination
        const result = await ctx.db.query('user').paginate(args.paginationOpts);

        return result;
    },
});

export const banUser = mutationWithRLS({
    args: {
        userId: v.string(),
        banReason: v.optional(v.string()),
        banExpires: v.optional(v.number()),
    },
    handler: async (ctx, args) => {

        await requireAdmin(ctx);

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx); 

        await auth.api.banUser({
            body: {
                userId: args.userId,
                banReason: args.banReason,
                banExpiresIn: args.banExpires,
            },
            headers,
        });

        return { success: true };
    },
});

export const unbanUser = mutationWithRLS({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {

        await requireAdmin(ctx);

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        await auth.api.unbanUser({
            body: {
                userId: args.userId,
            },
            headers,
        });

        return { success: true };
    },
});

export const updateUserRole = mutationWithRLS({
    args: {
        userId: v.id('user'),
        role: v.string(),
    },
    handler: async (ctx, args) => {

        await requireAdmin(ctx);

        await ctx.db.patch('user', args.userId, {
            role: args.role,
        });

        return { success: true };
    },
});

export const deleteUser = mutationWithRLS({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {

        await requireAdmin(ctx);

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        await auth.api.removeUser({
            body: {
                userId: args.userId,
            },
            headers,
        });

        return { success: true };
    },
});

export const listUserSessions = queryWithRLS({
    args: {
        userId: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx as unknown as GenericMutationCtx<DataModel>);

        const sessions = await ctx.db.query('session').withIndex('userId', q => q.eq('userId', args.userId)).collect();

        return sessions;
    },
});