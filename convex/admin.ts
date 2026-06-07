import { ConvexError, v } from 'convex/values';
import { getAuth } from './generated/auth';
import { paginationOptsValidator } from 'convex/server';
import { requireAdmin } from './utils/requiredAdmin';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { getHeaders } from 'kitcn/auth';
import { toSessionListItem } from './sessions';
import { ERROR_CODES } from './utils/constants';
import { isPlatformSetupUser } from './platform/setup/bootstrap';

type AdminApi = {
    banUser: (args: {
        body: { userId: string; banReason?: string; banExpiresIn?: number };
        headers: Headers;
    }) => Promise<unknown>;
    unbanUser: (args: { body: { userId: string }; headers: Headers }) => Promise<unknown>;
    removeUser: (args: { body: { userId: string }; headers: Headers }) => Promise<unknown>;
};

function getAdminApi(auth: { api: unknown }): AdminApi {
    return auth.api as AdminApi;
}

export const listUsers = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        searchValue: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const search = args.searchValue?.trim();
        const result = search
            ? search.includes('@')
                ? await ctx.db
                      .query('user')
                      .withSearchIndex('search_user_email', q => q.search('email', search))
                      .paginate(args.paginationOpts)
                : await ctx.db
                      .query('user')
                      .withSearchIndex('search_user_name', q => q.search('name', search))
                      .paginate(args.paginationOpts)
            : await ctx.db.query('user').withIndex('email_name').paginate(args.paginationOpts);

        return result;
    },
});

export const banUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
        banReason: v.optional(v.string()),
        banExpires: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const adminApi = getAdminApi(auth);

        await adminApi.banUser({
            body: {
                userId: args.userId,
                banReason: args.banReason,
                banExpiresIn: args.banExpires,
            },
            headers,
        });

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .collect();

        for (const session of sessions) {
            await ctx.db.delete(session._id);
        }

        return { success: true };
    },
});

export const unbanUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const adminApi = getAdminApi(auth);

        await adminApi.unbanUser({
            body: {
                userId: args.userId,
            },
            headers,
        });

        return { success: true };
    },
});

export const deleteUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        if (await isPlatformSetupUser(ctx, args.userId)) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN);
        }

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const adminApi = getAdminApi(auth);

        await adminApi.removeUser({
            body: {
                userId: args.userId,
            },
            headers,
        });

        return { success: true };
    },
});

export const revokeUserSession = mutationWithRLS({
    args: {
        userId: v.id('user'),
        sessionId: v.id('session'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== args.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.db.delete(args.sessionId);

        return { success: true };
    },
});

export const listUserSessions = queryWithRLS({
    args: {
        userId: v.id('user'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const result = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .order('desc')
            .paginate(args.paginationOpts);

        return {
            page: result.page.map(session => toSessionListItem(session, null)),
            continueCursor: result.continueCursor,
            isDone: result.isDone,
        };
    },
});
