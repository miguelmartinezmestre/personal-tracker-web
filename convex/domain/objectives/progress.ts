import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';
import { shouldSendProgressNotification } from '../notifications/preferences';
import { ERROR_CODES } from '../../utils/constants';
import {
    applyObjectiveProgressDelta,
    normalizeUpdateDate,
    reconcileObjectiveMetrics,
    validateObjectiveNotCompleted,
    validateProgressDelta,
} from './metrics';
import { assertObjectiveAction, resolveObjectivePermissionSubject } from './access';
import { canEditProgress } from './permissions';
import { PROGRESS_COMMENT_MAX_LENGTH } from '../../../shared/input-constraints';
import { assertOptionalBoundedString } from '../../utils/inputValidation';

const PROGRESS_SERIES_LIMIT = 500;

type AchievementTrigger = 'objective_created' | 'objective_completed' | 'progress_update';

async function insertObjectiveCompletedNotificationIfEnabled(
    ctx: MutationCtx,
    objective: Doc<'objectives'>,
    now = Date.now()
) {
    const notifyProgress = await shouldSendProgressNotification(ctx, objective.ownerId);
    if (!notifyProgress) {
        return;
    }

    await ctx.db.insert('notifications', {
        userId: objective.ownerId,
        organizationId: objective.organizationId,
        objective: objective._id,
        read: false,
        notificationType: 'status',
        notificationDate: now,
        message: `Objective "${objective.title}" completed.`,
        createdAt: now,
        updatedAt: now,
    });
}

/**
 * Schedules achievement evaluators while preserving their distinct attribution:
 * individual metrics belong to the user whose data is counted, while an
 * organization award records the user who caused the organization event.
 */
export async function scheduleAchievementChecks(
    ctx: MutationCtx,
    args: {
        individualUserId: Id<'user'>;
        organizationContributorUserId?: Id<'user'>;
        organizationId: Id<'organization'>;
        trigger: AchievementTrigger;
    }
) {
    await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
        userId: args.individualUserId,
        organizationId: args.organizationId,
        trigger: args.trigger,
    });
    if (args.organizationContributorUserId) {
        await ctx.scheduler.runAfter(0, internal.achievements.checkOrganizationAchievements, {
            organizationId: args.organizationId,
            userId: args.organizationContributorUserId,
            trigger: args.trigger,
        });
    }
}

/**
 * Reconciles an objective's completion state from its maintained current value
 * *synchronously* and emits the relevant side effects when it transitions to
 * completed or first qualifies as an early bird after a deadline edit. Used by
 * objective definition changes (update/restore) so status and achievements do
 * not depend on the asynchronous lifecycle workflow. Idempotent: a subsequent
 * reconciliation observes the materialized state and does nothing.
 */
export async function finalizeObjectiveCompletion(
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    actingUserId: Id<'user'>
): Promise<{ completedNow: boolean; earlyBirdCompletedNow: boolean }> {
    const { completedNow, earlyBirdCompletedNow } = await reconcileObjectiveMetrics(
        ctx,
        objectiveId
    );
    if (!completedNow && !earlyBirdCompletedNow) {
        return { completedNow, earlyBirdCompletedNow };
    }

    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective) {
        return { completedNow, earlyBirdCompletedNow };
    }

    if (completedNow) {
        await insertObjectiveCompletedNotificationIfEnabled(ctx, objective);
    }

    await scheduleAchievementChecks(ctx, {
        individualUserId: objective.createdBy,
        organizationContributorUserId: completedNow ? actingUserId : undefined,
        organizationId: objective.organizationId,
        trigger: 'objective_completed',
    });

    return { completedNow, earlyBirdCompletedNow };
}

type ProgressMutationCtx = MutationCtx & {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

async function assertCanEditProgressEntry(
    ctx: ProgressMutationCtx,
    progressUpdate: { createdBy: Id<'user'>; objective: Id<'objectives'> }
) {
    const objective = await ctx.db.get('objectives', progressUpdate.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    const subject = await resolveObjectivePermissionSubject(ctx, objective);
    if (
        !canEditProgress(subject, {
            authorId: progressUpdate.createdBy,
            ownerId: objective.ownerId,
        })
    ) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
    }
}

export async function createProgressUpdate(
    ctx: ProgressMutationCtx,
    args: {
        actingUserId: Id<'user'>;
        objective: Id<'objectives'>;
        updatedValue: number;
        updateDate: number;
        comment?: string;
    }
) {
    const objective = await ctx.db.get('objectives', args.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    await assertObjectiveAction(ctx, objective, 'contributeProgress');

    const updateDate = normalizeUpdateDate(args.updateDate);
    validateProgressDelta(args.updatedValue, objective.currentValue);
    validateObjectiveNotCompleted(objective.status);
    assertOptionalBoundedString(args.comment, PROGRESS_COMMENT_MAX_LENGTH);

    const now = Date.now();
    const progressUpdateId = await ctx.db.insert('progressUpdates', {
        objective: args.objective,
        createdBy: args.actingUserId,
        organizationId: objective.organizationId,
        updatedValue: args.updatedValue,
        updateDate,
        comment: args.comment,
        createdAt: now,
        updatedAt: now,
    });

    const { completedNow } = await applyObjectiveProgressDelta(
        ctx,
        objective._id,
        args.updatedValue
    );

    const notifyProgress = await shouldSendProgressNotification(ctx, objective.ownerId);
    if (notifyProgress) {
        await ctx.db.insert('notifications', {
            userId: objective.ownerId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            notificationDate: now,
            message: `Progress added to "${objective.title}": +${args.updatedValue}${
                objective.unit ? ` ${objective.unit}` : ''
            }`,
            createdAt: now,
            updatedAt: now,
        });
    }

    if (completedNow) {
        await insertObjectiveCompletedNotificationIfEnabled(ctx, objective, now);
    }

    await scheduleAchievementChecks(ctx, {
        individualUserId: args.actingUserId,
        organizationContributorUserId: args.actingUserId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

    if (completedNow) {
        await scheduleAchievementChecks(ctx, {
            individualUserId: objective.createdBy,
            organizationContributorUserId: args.actingUserId,
            organizationId: objective.organizationId,
            trigger: 'objective_completed',
        });
    }

    return await ctx.db.get('progressUpdates', progressUpdateId);
}

export async function listProgressUpdatesByObjective(
    ctx: { db: DatabaseReader },
    args: {
        objectiveId: Id<'objectives'>;
        paginationOpts: PaginationOptions;
    }
) {
    const results = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
        .order('desc')
        .paginate(args.paginationOpts);

    return results;
}

export async function getProgressSeriesByObjective(
    ctx: { db: DatabaseReader },
    args: { objectiveId: Id<'objectives'> }
) {
    const results = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
        .order('desc')
        .take(PROGRESS_SERIES_LIMIT + 1);

    const isTruncated = results.length > PROGRESS_SERIES_LIMIT;
    const points = results.slice(0, PROGRESS_SERIES_LIMIT).reverse();

    return { points, isTruncated };
}

export async function updateProgressUpdate(
    ctx: ProgressMutationCtx,
    args: {
        id: Id<'progressUpdates'>;
        updatedValue: number;
        updateDate: number;
        comment?: string;
    }
) {
    const existing = await ctx.db.get('progressUpdates', args.id);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await assertCanEditProgressEntry(ctx, existing);

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    const updateDate = normalizeUpdateDate(args.updateDate);
    assertOptionalBoundedString(args.comment, PROGRESS_COMMENT_MAX_LENGTH);
    // Validate against the true resulting value: the objective's current value
    // without this entry's previous contribution, plus its new contribution.
    // (Editing/deleting a past entry is allowed even once the objective is
    // completed — the delta may legitimately re-open it — so unlike
    // creating a new entry there is no "already completed" guard here.)
    validateProgressDelta(args.updatedValue, objective.currentValue - existing.updatedValue);

    await ctx.db.patch('progressUpdates', args.id, {
        updatedValue: args.updatedValue,
        updateDate,
        comment: args.comment,
        updatedAt: Date.now(),
    });

    const { completedNow } = await applyObjectiveProgressDelta(
        ctx,
        objective._id,
        args.updatedValue - existing.updatedValue
    );

    await scheduleAchievementChecks(ctx, {
        individualUserId: existing.createdBy,
        organizationContributorUserId: ctx.userId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

    if (completedNow) {
        await scheduleAchievementChecks(ctx, {
            individualUserId: objective.createdBy,
            organizationContributorUserId: ctx.userId,
            organizationId: objective.organizationId,
            trigger: 'objective_completed',
        });

        await insertObjectiveCompletedNotificationIfEnabled(ctx, objective);
    }

    return await ctx.db.get('progressUpdates', args.id);
}

export async function deleteProgressUpdate(
    ctx: ProgressMutationCtx,
    args: { id: Id<'progressUpdates'> }
) {
    const existing = await ctx.db.get('progressUpdates', args.id);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await assertCanEditProgressEntry(ctx, existing);

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        await ctx.db.delete('progressUpdates', args.id);
        return { success: true } as const;
    }
    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_DELETED);
    }

    await ctx.db.delete('progressUpdates', args.id);
    await applyObjectiveProgressDelta(ctx, objective._id, -existing.updatedValue);

    return { success: true } as const;
}
