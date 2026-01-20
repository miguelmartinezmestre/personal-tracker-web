import { v } from 'convex/values';
import { components } from './_generated/api';
import { authComponent, createAuth } from './auth';
import { paginationOptsValidator } from 'convex/server';
import { requireAdmin } from './utils/requiredAdmin';
import { mutationWithRLS, queryWithRLS } from './rls';

export type BetterAuthUser = {
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: number;
    updatedAt: number;
    userId: string | null;
    role: string | null;
    banned: boolean | null;
    banReason: string | null;
    banExpires: number | null;
};

export type UserSession = {
    _id: string;
    _creationTime: number;
    expiresAt: number,
    token: string,
    createdAt: number,
    updatedAt: number,
    ipAddress?: string | null | undefined,
    userAgent?: string | null | undefined,
    userId: string,
    impersonatedBy?: string | null | undefined,
    activeOrganizationId?: string | null | undefined,
};

export type PaginationResult<T> = {
    continueCursor: string | null;
    isDone: boolean;
    page: T[];
};

export type AdminUsersResult = PaginationResult<BetterAuthUser>;

export const listUsers = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        searchValue: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<PaginationResult<BetterAuthUser>> => {

        await requireAdmin(ctx);

        // Get all users from BetterAuth user table
        const users = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: 'user',
            paginationOpts: args.paginationOpts,
        })) as PaginationResult<BetterAuthUser>;

        return users;
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

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

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

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

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
        userId: v.string(),
        role: v.string(),
    },
    handler: async (ctx, args) => {
        
        await requireAdmin(ctx);

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

export const deleteUser = mutationWithRLS({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        
        await requireAdmin(ctx);

        const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

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
        await requireAdmin(ctx);
        
        const sessions = await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: 'session',
            where: [{ field: 'userId', value: args.userId, operator: 'eq' }],
            paginationOpts: args.paginationOpts,
        }) as PaginationResult<UserSession>;

        return sessions;
    },
});