import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { mutationWithRLS, queryWithRLS } from './rls';
import { ERROR_CODES } from './utils/constants';
import {
    validateProgressDelta,
    validateUpdateDate,
    validateObjectiveNotCompleted,
    recomputeObjectiveFromProgress,
} from './utils/objectiveDomain';
import { shouldSendProgressNotification } from './notificationPreferences';
import { runObjectiveSync } from './utils/objectiveWorkflow';
import { isVitestRuntime } from './utils/testRuntime';

const PROGRESS_SERIES_LIMIT = 500;

export const createUpdateProgress = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        validateUpdateDate(args.updateDate);

        validateProgressDelta(args.updatedValue);

        validateObjectiveNotCompleted(objective.status);

        const now = Date.now();
        const id = await ctx.db.insert('progressUpdates', {
            objective: args.objective,
            userId: objective.userId,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            comment: args.comment,
            createdAt: now,
            updatedAt: now,
        });

        const newCurrentValue = objective.currentValue + args.updatedValue;
        const newStatus = newCurrentValue >= objective.targetValue ? 'completed' : 'active';
        const completedNow = objective.status !== 'completed' && newStatus === 'completed';
        await ctx.db.patch('objectives', args.objective, {
            currentValue: newCurrentValue,
            status: newStatus,
            updatedAt: now,
        });

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

        if (!isVitestRuntime()) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.userId,
                organizationId: objective.organizationId,
                trigger: 'progress_update',
            });
        }

        await runObjectiveSync(
            ctx,
            args.objective,
            objective.userId,
            objective.organizationId,
            'progress_update'
        );

        return await ctx.db.get('progressUpdates', id);
    },
});

export const getUpdateProgressByObjectiveId = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
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
    },
});

export const getProgressSeriesByObjectiveId = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
            .order('desc')
            .take(PROGRESS_SERIES_LIMIT + 1);

        const isTruncated = results.length > PROGRESS_SERIES_LIMIT;
        const points = results.slice(0, PROGRESS_SERIES_LIMIT).reverse();

        return { points, isTruncated };
    },
});

export const updateUpdateProgress = mutationWithRLS({
    args: {
        id: v.id('progressUpdates'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('progressUpdates', args.id);
        if (!existing) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }

        const objective = await ctx.db.get('objectives', existing.objective);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        validateUpdateDate(args.updateDate);

        validateProgressDelta(args.updatedValue);

        validateObjectiveNotCompleted(objective.status);

        await ctx.db.patch('progressUpdates', args.id, {
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            comment: args.comment,
            updatedAt: Date.now(),
        });

        const { completedNow } = await recomputeObjectiveFromProgress(ctx, objective);

        if (!isVitestRuntime()) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.userId,
                organizationId: objective.organizationId,
                trigger: 'progress_update',
            });
        }

        if (completedNow) {
            await ctx.db.insert('notifications', {
                userId: objective.userId,
                organizationId: objective.organizationId,
                objective: existing.objective,
                read: false,
                notificationType: 'status',
                notificationDate: Date.now(),
                message: `Objective "${objective.title}" completed.`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        await runObjectiveSync(
            ctx,
            existing.objective,
            objective.userId,
            objective.organizationId,
            'progress_update'
        );

        return await ctx.db.get('progressUpdates', args.id);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: {
        _id: v.id('progressUpdates'),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('progressUpdates', args._id);
        if (!existing) {
            return { success: true } as const;
        }

        const objective = await ctx.db.get('objectives', existing.objective);
        if (!objective) {
            await ctx.db.delete('progressUpdates', args._id);
            return { success: true } as const;
        }

        await ctx.db.delete('progressUpdates', args._id);

        await recomputeObjectiveFromProgress(ctx, objective);

        await runObjectiveSync(
            ctx,
            objective._id,
            objective.userId,
            objective.organizationId,
            'progress_update'
        );

        return { success: true } as const;
    },
});
