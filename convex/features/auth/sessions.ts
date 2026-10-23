import { ConvexError } from 'convex/values';
import { getSession } from 'kitcn/auth';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';

export const SESSION_REVOCATION_BATCH_SIZE = 100;

// A brand-new account has the session it just signed in with, at most.
export const NEW_ACCOUNT_SESSIONS = 5;

export async function currentSessionId(ctx: QueryCtx) {
    const session = await getSession(ctx);

    if (!session) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    return session._id;
}

// Deletes up to one batch of the user's other sessions and reschedules while any remain.
export async function revokeOtherSessionsBatch(
    ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
    args: { userId: Id<'user'>; keepSessionId: Id<'session'> }
) {
    // One extra row tells whether more remain once the kept session is skipped.
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
