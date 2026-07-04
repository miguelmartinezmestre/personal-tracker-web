import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';
import { shouldSendProgressNotification } from '../notifications/preferences';
import { ERROR_CODES } from '../../utils/constants';
import {
    applyObjectiveProgressDelta,
    recomputeObjectiveFromProgress,
    validateObjectiveNotCompleted,
    validateProgressDelta,
    validateUpdateDate,
} from './metrics';
import { assertObjectiveAction, resolveObjectivePermissionSubject } from './access';
import { canEditProgress } from './permissions';

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
 * Schedules both the individual and the organization achievement evaluators for
 * a given trigger. Both scopes must be checked together so that org-level
 * achievements (org objectives created/completed, org streak) are actually
 * awarded — previously only the individual scope was ever scheduled.
 */
export async function scheduleAchievementChecks(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        trigger: AchievementTrigger;
    }
) {
    await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
        userId: args.userId,
        organizationId: args.organizationId,
        trigger: args.trigger,
    });
    await ctx.scheduler.runAfter(0, internal.achievements.checkOrganizationAchievements, {
        organizationId: args.organizationId,
        userId: args.userId,
        trigger: args.trigger,
    });
}

/**
 * Recomputes an objective's completion state from its progress history
 * *synchronously* and emits the completion side effects (notification +
 * achievement checks) when it transitions to completed. Used by objective
 * definition changes (update/restore) so the status is never left stale if the
 * asynchronous lifecycle workflow fails to start. Idempotent: a subsequent
 * recompute observes the already-completed status and does nothing.
 */
export async function finalizeObjectiveCompletion(
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    actingUserId: Id<'user'>
): Promise<{ completedNow: boolean }> {
    const { completedNow } = await recomputeObjectiveFromProgress(ctx, objectiveId);
    if (!completedNow) {
        return { completedNow };
    }

    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective) {
        return { completedNow };
    }

    await insertObjectiveCompletedNotificationIfEnabled(ctx, objective);

    await scheduleAchievementChecks(ctx, {
        userId: actingUserId,
        organizationId: objective.organizationId,
        trigger: 'objective_completed',
    });

    return { completedNow };
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

    validateUpdateDate(args.updateDate);
    validateProgressDelta(args.updatedValue, objective.currentValue);
    validateObjectiveNotCompleted(objective.status);

    const now = Date.now();
    const progressUpdateId = await ctx.db.insert('progressUpdates', {
        objective: args.objective,
        createdBy: args.actingUserId,
        organizationId: objective.organizationId,
        updatedValue: args.updatedValue,
        updateDate: args.updateDate,
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
        userId: args.actingUserId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

    if (completedNow) {
        await scheduleAchievementChecks(ctx, {
            userId: args.actingUserId,
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

    return {
        page: results.page,
        continueCursor: results.continueCursor,
        isDone: results.isDone,
    };
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

    validateUpdateDate(args.updateDate);
    // Validate against the true resulting value: the objective's current value
    // without this entry's previous contribution, plus its new contribution.
    // (Editing/deleting a past entry is allowed even once the objective is
    // completed — the recompute may legitimately re-open it — so unlike
    // creating a new entry there is no "already completed" guard here.)
    validateProgressDelta(args.updatedValue, objective.currentValue - existing.updatedValue);

    await ctx.db.patch('progressUpdates', args.id, {
        updatedValue: args.updatedValue,
        updateDate: args.updateDate,
        comment: args.comment,
        updatedAt: Date.now(),
    });

    const { completedNow } = await applyObjectiveProgressDelta(
        ctx,
        objective._id,
        args.updatedValue - existing.updatedValue
    );

    await scheduleAchievementChecks(ctx, {
        userId: ctx.userId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

    if (completedNow) {
        await scheduleAchievementChecks(ctx, {
            userId: ctx.userId,
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

    await ctx.db.delete('progressUpdates', args.id);

    await recomputeObjectiveFromProgress(ctx, objective._id);

    return { success: true } as const;
}
