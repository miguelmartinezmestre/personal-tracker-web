import { internalMutation } from './platform/db/internalMutation';
import { v, ConvexError } from 'convex/values';
import { internal } from './_generated/api';
import { type MutationCtx } from './_generated/server';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { paginationOptsValidator } from 'convex/server';
import { getSession } from 'kitcn/auth';
import { ERROR_CODES } from './utils/constants';
import type { Doc, Id } from './_generated/dataModel';
import { paginatedSessionsValidator } from './utils/apiReturnValidators';
import { withInvalidCursorRetry } from './utils/pagination';
export type SessionListItem = {
    _id: Id<'session'>;
    createdAt: number;
    expiresAt: number;
    ipAddress: string | null;
    userAgent: string | null;
    isCurrent: boolean;
};
const SESSION_REVOCATION_BATCH_SIZE = 100;
type OtherSessionRevocationResult = {
    status: 'in_progress' | 'completed';
    revokedCount: number;
};
async function revokeOtherSessionsBatch(
    ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
    args: {
        userId: Id<'user'>;
        currentSessionId: Id<'session'>;
        totalRevoked?: number;
    }
): Promise<OtherSessionRevocationResult> {
    // Read two extra rows so `hasMore` remains accurate whether the preserved
    // current session is inside or outside this index window.
    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', args.userId))
        .take(SESSION_REVOCATION_BATCH_SIZE + 2);
    const otherSessions = sessions.filter(session => session._id !== args.currentSessionId);
    const batch = otherSessions.slice(0, SESSION_REVOCATION_BATCH_SIZE);
    for (const session of batch) {
        await ctx.db.delete('session', session._id);
    }
    const revokedCount = (args.totalRevoked ?? 0) + batch.length;
    if (otherSessions.length > batch.length) {
        await ctx.scheduler.runAfter(0, internal.sessions.continueOtherSessionRevocation, {
            userId: args.userId,
            currentSessionId: args.currentSessionId,
            totalRevoked: revokedCount,
        });
        return { status: 'in_progress', revokedCount };
    }
    return { status: 'completed', revokedCount };
}
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
    returns: paginatedSessionsValidator,
    handler: async (ctx, args) => {
        const currentSession = await getSession(ctx);
        if (!currentSession) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }
        const paginatedSessions = await withInvalidCursorRetry(
            args.paginationOpts,
            paginationOpts =>
                ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', ctx.userId))
                    .order('desc')
                    .paginate(paginationOpts)
        );
        return {
            ...paginatedSessions,
            page: paginatedSessions.page.map(session =>
                toSessionListItem(session, currentSession._id)
            ),
        };
    },
});
export const invalidateSession = mutationWithRLS({
    args: { sessionId: v.id('session') },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        const session = await ctx.db.get('session', args.sessionId);
        if (!session || session.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        await ctx.db.delete('session', args.sessionId);
        return { success: true };
    },
});
export const invalidateAllOtherSessions = mutationWithRLS({
    args: { currentSessionId: v.id('session') },
    returns: v.object({
        success: v.boolean(),
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        revokedCount: v.number(),
    }),
    handler: async (ctx, args) => {
        const current = await ctx.db.get('session', args.currentSessionId);
        if (!current || current.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        const result = await revokeOtherSessionsBatch(ctx, {
            userId: ctx.userId,
            currentSessionId: args.currentSessionId,
        });
        return { success: true, ...result };
    },
});
export const continueOtherSessionRevocation = internalMutation({
    args: {
        userId: v.id('user'),
        currentSessionId: v.id('session'),
        totalRevoked: v.optional(v.number()),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        revokedCount: v.number(),
    }),
    handler: async (ctx, args): Promise<OtherSessionRevocationResult> => {
        return await revokeOtherSessionsBatch(ctx, args);
    },
});
