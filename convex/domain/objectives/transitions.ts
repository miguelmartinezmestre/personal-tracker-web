import { ConvexError } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { shouldSendProgressNotification } from '../notifications/preferences';
import { isOperationalMember, requireOperationalOrganization } from '../organizations/operational';
import { applyObjectiveProgressDelta } from './metrics';

type AchievementTrigger = 'objective_created' | 'objective_completed' | 'progress_update';

export async function scheduleAchievementChecks(
    ctx: MutationCtx,
    args: {
        individualUserId: Id<'user'>;
        organizationContributorUserId?: Id<'user'>;
        organizationId: Id<'organization'>;
        trigger: AchievementTrigger;
    }
) {
    if (await isOperationalMember(ctx, args.organizationId, args.individualUserId)) {
        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId: args.individualUserId,
            organizationId: args.organizationId,
            trigger: args.trigger,
        });
    }
    if (
        args.organizationContributorUserId &&
        (await isOperationalMember(ctx, args.organizationId, args.organizationContributorUserId))
    ) {
        await ctx.scheduler.runAfter(0, internal.achievements.checkOrganizationAchievements, {
            organizationId: args.organizationId,
            userId: args.organizationContributorUserId,
            trigger: args.trigger,
        });
    }
}

async function notifyCompletion(ctx: MutationCtx, objective: Doc<'objectives'>) {
    if (
        !(await isOperationalMember(ctx, objective.organizationId, objective.ownerId)) ||
        !(await shouldSendProgressNotification(ctx, objective.ownerId))
    ) {
        return;
    }
    const now = Date.now();
    await ctx.db.insert('notifications', {
        userId: objective.ownerId,
        organizationId: objective.organizationId,
        objective: objective._id,
        read: false,
        notificationType: 'status',
        messageKey: 'objectiveCompleted',
        messageParams: { title: objective.title },
        message: `Objective "${objective.title}" completed.`,
        notificationDate: now,
        createdAt: now,
        updatedAt: now,
    });
}

/** One transaction owns the metric/status transition, derived-data triggers and effects.
 * A queued reconciliation repeats it safely without scheduling another.
 * Attribution remains per progress author and per objective creator.
 */
export async function transitionObjective(
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    args: {
        actorUserId: Id<'user'>;
        delta?: number;
        progressAuthorId?: Id<'user'>;
        created?: boolean;
        scheduleReconciliation?: boolean;
    }
) {
    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective || objective.deletedAt !== undefined || objective.purgeToken !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }
    await requireOperationalOrganization(ctx, objective.organizationId);
    const result = await applyObjectiveProgressDelta(ctx, objectiveId, args.delta ?? 0);
    if (result.completedNow) {
        await notifyCompletion(ctx, objective);
    }
    if (result.completedNow || result.earlyBirdCompletedNow) {
        await scheduleAchievementChecks(ctx, {
            individualUserId: objective.createdBy,
            organizationContributorUserId: result.completedNow ? args.actorUserId : undefined,
            organizationId: objective.organizationId,
            trigger: 'objective_completed',
        });
    }
    if (args.created || args.progressAuthorId) {
        await scheduleAchievementChecks(ctx, {
            individualUserId: args.progressAuthorId ?? objective.createdBy,
            organizationContributorUserId: args.actorUserId,
            organizationId: objective.organizationId,
            trigger: args.created ? 'objective_created' : 'progress_update',
        });
    }
    if (
        args.scheduleReconciliation !== false &&
        (!args.progressAuthorId || result.status !== objective.status)
    ) {
        await ctx.scheduler.runAfter(
            0,
            internal.jobs.objectives.syncObjectiveFromProgress.syncObjectiveFromProgress,
            {
                objectiveId,
                actorUserId: args.actorUserId,
            }
        );
    }
    return { ...result, reopened: objective.status === 'completed' && result.status === 'active' };
}
