import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
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

const PROGRESS_SERIES_LIMIT = 500;

export async function createProgressUpdate(
    ctx: MutationCtx,
    args: {
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

    validateUpdateDate(args.updateDate);
    validateProgressDelta(args.updatedValue, objective.currentValue);
    validateObjectiveNotCompleted(objective.status);

    const now = Date.now();
    const progressUpdateId = await ctx.db.insert('progressUpdates', {
        objective: args.objective,
        userId: objective.userId,
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

    const notifyProgress = await shouldSendProgressNotification(ctx, objective.userId);
    if (notifyProgress) {
        await ctx.db.insert('notifications', {
            userId: objective.userId,
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
        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: 'status',
            notificationDate: now,
            message: `Objective "${objective.title}" completed.`,
            createdAt: now,
            updatedAt: now,
        });
    }

    await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
        userId: objective.userId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

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
    ctx: MutationCtx,
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

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    validateUpdateDate(args.updateDate);
    validateProgressDelta(args.updatedValue, objective.currentValue);
    validateObjectiveNotCompleted(objective.status);

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

    await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
        userId: objective.userId,
        organizationId: objective.organizationId,
        trigger: 'progress_update',
    });

    if (completedNow) {
        const now = Date.now();
        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: existing.objective,
            read: false,
            notificationType: 'status',
            notificationDate: now,
            message: `Objective "${objective.title}" completed.`,
            createdAt: now,
            updatedAt: now,
        });
    }

    return await ctx.db.get('progressUpdates', args.id);
}

export async function deleteProgressUpdate(ctx: MutationCtx, args: { id: Id<'progressUpdates'> }) {
    const existing = await ctx.db.get('progressUpdates', args.id);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        await ctx.db.delete('progressUpdates', args.id);
        return { success: true } as const;
    }

    await ctx.db.delete('progressUpdates', args.id);

    await recomputeObjectiveFromProgress(ctx, objective._id);

    return { success: true } as const;
}
