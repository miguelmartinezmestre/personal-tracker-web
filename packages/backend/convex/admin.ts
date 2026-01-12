import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { components } from './_generated/api';
import { authComponent } from './auth';

/**
 * List all users (admin only)
 */
export const listUsers = query({
    args: {
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        searchValue: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Verify admin role
        const currentUser = await authComponent.getAuthUser(ctx);
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Admin access required');
        }

        const limit = args.limit ?? 10;
        const offset = args.offset ?? 0;

        // Get all users from BetterAuth user table
        let users = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: 'user',
            paginationOpts: {
                numItems: 1000,
                cursor: null,
            },
        })) as Array<Record<string, unknown>>;

        // Filter by search value if provided
        if (args.searchValue) {
            const search = args.searchValue.toLowerCase();
            users = users.filter(
                (user: { email?: string; name?: string }) =>
                    user.email?.toLowerCase().includes(search) ||
                    user.name?.toLowerCase().includes(search)
            );
        }

        const total = users.length;

        // Apply pagination
        const paginatedUsers = users.slice(offset, offset + limit);

        return {
            users: paginatedUsers.map((user: Record<string, unknown>) => ({
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                banned: user.banned,
                banReason: user.banReason,
                banExpires: user.banExpires,
                createdAt: user.createdAt,
            })),
            total,
        };
    },
});

/**
 * Ban a user (admin only)
 */
export const banUser = mutation({
    args: {
        userId: v.string(),
        banReason: v.optional(v.string()),
        banExpires: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Verify admin role
        const currentUser = await authComponent.getAuthUser(ctx);
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Admin access required');
        }

        // Update user to banned
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: args.userId }],
                update: {
                    banned: true,
                    banReason: args.banReason ?? 'Banned by administrator',
                    banExpires: args.banExpires ?? null,
                },
            },
        });

        return { success: true };
    },
});

/**
 * Unban a user (admin only)
 */
export const unbanUser = mutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify admin role
        const currentUser = await authComponent.getAuthUser(ctx);
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Admin access required');
        }

        // Update user to unbanned
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: args.userId }],
                update: {
                    banned: false,
                    banReason: null,
                    banExpires: null,
                },
            },
        });

        return { success: true };
    },
});

/**
 * Update user role (admin only)
 */
export const updateUserRole = mutation({
    args: {
        userId: v.string(),
        role: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify admin role
        const currentUser = await authComponent.getAuthUser(ctx);
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Admin access required');
        }

        // Prevent self-demotion
        if (String(currentUser._id) === args.userId && args.role !== 'admin') {
            throw new Error('Cannot remove your own admin role');
        }

        // Update user role
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: args.userId }],
                update: {
                    role: args.role,
                },
            },
        });

        return { success: true };
    },
});

/**
 * Delete a user (admin only)
 */
export const deleteUser = mutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify admin role
        const currentUser = await authComponent.getAuthUser(ctx);
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Admin access required');
        }

        // Prevent self-deletion
        if (String(currentUser._id) === args.userId) {
            throw new Error('Cannot delete your own account');
        }

        // Delete user sessions first
        const sessions = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: 'session',
            paginationOpts: {
                numItems: 1000,
                cursor: null,
            },
            where: [{ field: 'userId', value: args.userId }],
        })) as Array<{ _id: string }>;

        for (const session of sessions) {
            await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
                input: {
                    model: 'session',
                    where: [{ field: '_id', value: session._id }],
                },
            });
        }

        // Delete user accounts
        const accounts = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: 'account',
            paginationOpts: {
                numItems: 1000,
                cursor: null,
            },
            where: [{ field: 'userId', value: args.userId }],
        })) as Array<{ _id: string }>;

        for (const account of accounts) {
            await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
                input: {
                    model: 'account',
                    where: [{ field: '_id', value: account._id }],
                },
            });
        }

        // Delete user
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
            input: {
                model: 'user',
                where: [{ field: '_id', value: args.userId }],
            },
        });

        return { success: true };
    },
});
