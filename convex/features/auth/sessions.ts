import { ConvexError } from 'convex/values';
import { getSession } from 'kitcn/auth';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';

export const SESSION_REVOCATION_BATCH_SIZE = 100;

export const NEW_ACCOUNT_SESSIONS = 5;

export async function currentSessionId(ctx: QueryCtx) {
    const session = await getSession(ctx);

    if (!session) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    return session._id;
}

export async function revokeOtherSessionsBatch(
    ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
    args: { userId: Id<'user'>; keepSessionId: Id<'session'> }
) {
    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', args.userId))
        .take(SESSION_REVOCATION_BATCH_SIZE + 2);

    const others = sessions.filter(session => session._id !== args.keepSessionId);
    const batch = others.slice(0, SESSION_REVOCATION_BATCH_SIZE);

    for (const session of batch) {
        await ctx.db.delete('session', session._id);
    }

    if (others.length > batch.length) {
        await ctx.scheduler.runAfter(0, internal.sessions.continueSessionRevocation, args);
    }

    return batch.length;
}

export async function revokeBannedUserSessionsBatch(
    ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
    args: { userId: Id<'user'>; banUpdatedAt: number }
) {
    const user = await ctx.db.get('user', args.userId);

    if (user?.banned !== true || user.updatedAt !== args.banUpdatedAt) {
        return;
    }

    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', args.userId))
        .take(SESSION_REVOCATION_BATCH_SIZE + 1);

    for (const session of sessions.slice(0, SESSION_REVOCATION_BATCH_SIZE)) {
        await ctx.db.delete('session', session._id);
    }

    if (sessions.length > SESSION_REVOCATION_BATCH_SIZE) {
        await ctx.scheduler.runAfter(0, internal.admin.continueBanSessionRevocation, args);
    }
}
