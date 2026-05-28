import { v, ConvexError } from 'convex/values';
import { queryWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';
import { mutation } from './_generated/server';
import { getAuthUserIdentity } from 'kitcn/auth';
import { ERROR_CODES } from './utils/constants';
import type { Doc, Id } from './_generated/dataModel';

export type SessionListItem = {
    _id: Id<'session'>;
    createdAt: number;
    expiresAt: number;
    ipAddress: string | null;
    userAgent: string | null;
    isCurrent: boolean;
};

const MAX_OTHER_SESSIONS_TO_REVOKE = 1000;

export function toSessionListItem(
    session: Doc<'session'>,
    currentSessionId: Id<'session'> | null
): SessionListItem {
    return {
        _id: session._id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
        isCurrent: currentSessionId !== null && session._id === currentSessionId,
    };
}

export const getSessionsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity?.sessionId) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const currentSessionId = identity.sessionId;

        const paginatedSessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .order('desc')
            .paginate(args.paginationOpts);

        return {
            ...paginatedSessions,
            page: paginatedSessions.page.map(session =>
                toSessionListItem(session, currentSessionId)
            ),
        };
    },
});

export const invalidateSession = mutation({
    args: { sessionId: v.id('session') },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity?.userId) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== identity.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.db.delete(args.sessionId);

        return { success: true };
    },
});

export const invalidateAllOtherSessions = mutation({
    args: { currentSessionId: v.id('session') },
    returns: v.object({ success: v.boolean(), revokedCount: v.number() }),
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const current = await ctx.db.get(args.currentSessionId);
        if (!current || current.userId !== identity.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId as string))
            .take(MAX_OTHER_SESSIONS_TO_REVOKE + 2);

        const otherSessions = sessions.filter(session => session._id !== args.currentSessionId);
        if (otherSessions.length > MAX_OTHER_SESSIONS_TO_REVOKE) {
            throw new ConvexError('TOO_MANY_SESSIONS_TO_REVOKE');
        }

        let revokedCount = 0;
        for (const session of otherSessions) {
            await ctx.db.delete(session._id);
            revokedCount++;
        }

        return { success: true, revokedCount };
    },
});
