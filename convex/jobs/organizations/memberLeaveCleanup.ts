import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    findObjectiveSuccessorOwner,
    reassignOwnedObjective,
} from '../../domain/objectives/collaborators';
import { workflow } from '../../workflow';

const COLLABORATOR_BATCH_SIZE = 50;
const OBJECTIVE_BATCH_SIZE = 10;

export type MemberLeaveCleanupPhase = 'collaborators' | 'objectives';

type MemberLeaveCleanupArgs = {
    organizationId: Id<'organization'>;
    userId: Id<'user'>;
    phase?: MemberLeaveCleanupPhase;
};

async function scheduleNext(
    ctx: MutationCtx,
    args: MemberLeaveCleanupArgs,
    phase: MemberLeaveCleanupPhase
) {
    if (!(await ctx.db.get('organization', args.organizationId))) {
        return false;
    }

    await ctx.scheduler.runAfter(0, internal.admin.continueMemberLeaveCleanup, {
        organizationId: args.organizationId,
        userId: args.userId,
        phase,
    });
    return true;
}

async function membershipWasRestored(ctx: MutationCtx, args: MemberLeaveCleanupArgs) {
    return (
        (await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', args.userId)
            )
            .first()) !== null
    );
}

async function retireObjectiveWithoutSuccessor(
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    departingUserId: Id<'user'>
) {
    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective) {
        return;
    }

    if (objective.workflowId) {
        await workflow.cancel(ctx, objective.workflowId);
    }

    const now = Date.now();
    const purgeToken =
        objective.purgeToken ?? `member-leave-${String(objectiveId)}-${now.toString(36)}`;

    await ctx.db.patch('objectives', objectiveId, {
        deletedAt: objective.deletedAt ?? now,
        deletedBy: objective.deletedBy ?? departingUserId,
        purgeToken,
        purgeStartedAt: objective.purgeStartedAt ?? now,
        ownerDeletionProcessedAt: now,
        updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
        objectiveId,
        purgeToken,
        phase: 'collaborators',
        cursor: null,
        totalProgressDeleted: 0,
        totalNotificationsDeleted: 0,
    });
}

export async function startMemberLeaveCleanup(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    userId: Id<'user'>
) {
    await scheduleNext(ctx, { organizationId, userId }, 'collaborators');
}

export async function continueMemberLeaveCleanup(
    ctx: MutationCtx,
    args: MemberLeaveCleanupArgs
): Promise<{ status: 'in_progress' | 'completed'; phase: MemberLeaveCleanupPhase }> {
    const phase = args.phase ?? 'collaborators';

    // Organization deletion removes memberships in bulk and fires the same
    // member trigger as an ordinary leave. Stop those stale per-member jobs
    // immediately; the organization cascade owns all remaining cleanup.
    if (!(await ctx.db.get('organization', args.organizationId))) {
        return { status: 'completed', phase };
    }

    // Better Auth may implement some membership changes as delete + create.
    // Abort a stale cleanup before it can remove access from a restored member.
    if (await membershipWasRestored(ctx, args)) {
        return { status: 'completed', phase };
    }

    if (phase === 'collaborators') {
        const collaborators = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_user_organization', q =>
                q.eq('userId', args.userId).eq('organizationId', args.organizationId)
            )
            .take(COLLABORATOR_BATCH_SIZE);

        for (const collaborator of collaborators) {
            await ctx.db.delete('objectiveCollaborators', collaborator._id);
        }

        const nextPhase =
            collaborators.length === COLLABORATOR_BATCH_SIZE ? phase : ('objectives' as const);
        await scheduleNext(ctx, args, nextPhase);
        return { status: 'in_progress', phase: nextPhase };
    }

    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_owner_organization_ownerDeletionProcessedAt', q =>
            q
                .eq('ownerId', args.userId)
                .eq('organizationId', args.organizationId)
                .eq('ownerDeletionProcessedAt', undefined)
        )
        .take(OBJECTIVE_BATCH_SIZE);

    for (const objective of objectives) {
        const nextOwnerId = await findObjectiveSuccessorOwner(ctx, objective, args.userId);
        if (nextOwnerId) {
            await reassignOwnedObjective(ctx, objective, nextOwnerId);
        } else {
            await retireObjectiveWithoutSuccessor(ctx, objective._id, args.userId);
        }
    }

    if (objectives.length === OBJECTIVE_BATCH_SIZE) {
        await scheduleNext(ctx, args, phase);
        return { status: 'in_progress', phase };
    }

    return { status: 'completed', phase };
}
