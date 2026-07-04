import { ConvexError, v } from 'convex/values';
import { getAuth } from './generated/auth';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, type MutationCtx } from './_generated/server';
import { requireAdmin } from './utils/requiredAdmin';
import { cascadeUserDeletion } from './domain/objectives/collaborators';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { getHeaders } from 'kitcn/auth';
import { toSessionListItem } from './sessions';
import { ERROR_CODES } from './utils/constants';
import { isPlatformSetupUser } from './platform/setup/bootstrap';
import type { Id } from './_generated/dataModel';

const SESSION_REVOKE_BATCH_SIZE = 1000;

export async function revokeAllSessionsForUser(ctx: MutationCtx, userId: Id<'user'>) {
    let revokedCount = 0;
    let hasMoreSessions = true;
    while (hasMoreSessions) {
        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(SESSION_REVOKE_BATCH_SIZE);

        hasMoreSessions = sessions.length === SESSION_REVOKE_BATCH_SIZE;
        for (const session of sessions) {
            await ctx.db.delete(session._id);
            revokedCount += 1;
        }
    }

    return revokedCount;
}

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
        // Ban duration in **seconds from now** (better-auth `banExpiresIn`), not
        // an absolute timestamp. Omit for a permanent ban.
        banExpiresInSeconds: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        // The platform setup account must remain usable — mirror the delete guard.
        if (await isPlatformSetupUser(ctx, args.userId)) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_BAN_FORBIDDEN);
        }

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const adminApi = getAdminApi(auth);

        await adminApi.banUser({
            body: {
                userId: args.userId,
                banReason: args.banReason,
                banExpiresIn: args.banExpiresInSeconds,
            },
            headers,
        });

        await revokeAllSessionsForUser(ctx, args.userId);

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

/**
 * Cleans up a deleted user's app data (owned objectives, collaborations,
 * achievements, preferences, notifications). Invoked from the better-auth
 * `user.delete` hook so nothing is left pointing at a removed account.
 */
export const cascadeUserDeletionInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await cascadeUserDeletion(ctx, args.userId);
        return null;
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
