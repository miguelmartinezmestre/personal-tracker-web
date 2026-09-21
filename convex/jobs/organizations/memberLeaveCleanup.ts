import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

export type MemberLeaveCleanupPhase = 'done';

type MemberLeaveCleanupArgs = {
    organizationId: Id<'organization'>;
    userId: Id<'user'>;
    phase?: MemberLeaveCleanupPhase;
};

export async function startMemberLeaveCleanup(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    userId: Id<'user'>
) {
    if (!(await ctx.db.get('organization', organizationId))) {
        return;
    }
    await ctx.scheduler.runAfter(0, internal.cascades.continueMemberLeaveCleanup, {
        organizationId,
        userId,
        phase: 'done',
    });
}

export async function continueMemberLeaveCleanup(
    ctx: MutationCtx,
    args: MemberLeaveCleanupArgs
): Promise<{ status: 'in_progress' | 'completed'; phase: MemberLeaveCleanupPhase }> {
    if (!(await ctx.db.get('organization', args.organizationId))) {
        return { status: 'completed', phase: 'done' };
    }

    const restored =
        (await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', args.userId)
            )
            .first()) !== null;
    if (restored) {
        return { status: 'completed', phase: 'done' };
    }

    return { status: 'completed', phase: 'done' };
}
