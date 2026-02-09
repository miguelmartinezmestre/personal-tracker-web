import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import type { MutationCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { computeCurrentValue, computeLastProgressAt } from './utils/objectiveProgress';
import { computeNextReminderAt } from './utils/reminderSchedule';

const isObjectiveComplete = (
    objective: { direction?: string; targetValue: number },
    currentValue: number
) => {
    const direction = objective.direction ?? 'increase';
    if (direction === 'decrease') {
        return currentValue <= objective.targetValue;
    }
    return currentValue >= objective.targetValue;
};

const canCreateProgress = (status: string) => {
    return !['completed', 'archived', 'deleted'].includes(status);
};

const syncObjectiveCurrentValue = async (ctx: MutationCtx, objectiveId: Id<'objectives'>) => {
    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective) {
        return null;
    }

    const updates = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
        .collect();

    const currentValue = computeCurrentValue(objective, updates);
    const lastProgressAt = computeLastProgressAt(updates);
    await ctx.db.patch('objectives', objectiveId, {
        currentValue,
        lastProgressAt,
        lastStalledNotifiedAt: undefined,
        updatedAt: Date.now(),
    });

    return currentValue;
};

const syncObjectiveCompletionState = async (
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    currentValue: number
): Promise<{ completedNow: boolean; reopened: boolean }> => {
    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective) {
        return { completedNow: false, reopened: false };
    }

    if (objective.status === 'archived' || objective.status === 'deleted') {
        return { completedNow: false, reopened: false };
    }

    const now = Date.now();
    const shouldComplete = isObjectiveComplete(objective, currentValue);

    if (shouldComplete && objective.status !== 'completed') {
        await ctx.db.patch('objectives', objectiveId, {
            status: 'completed',
            nextReminderAt: undefined,
            updatedAt: now,
        });

        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: objectiveId,
            read: false,
            notificationType: 'status',
            notificationDate: now,
            message: `Your objective "${objective.title}" has been completed!`,
            createdAt: now,
            updatedAt: now,
        });
        return { completedNow: true, reopened: false };
    }

    if (!shouldComplete && objective.status === 'completed') {
        await ctx.db.patch('objectives', objectiveId, {
            status: 'active',
            nextReminderAt: computeNextReminderAt(objective.reminderInterval ?? 'none', now),
            updatedAt: now,
        });
        return { completedNow: false, reopened: true };
    }

    return { completedNow: false, reopened: false };
};

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
            throw new Error('Objective not found');
        }
        if (!canCreateProgress(objective.status)) {
            throw new Error('Cannot create progress for a completed or closed objective');
        }

        const now = Date.now();
        const id = await ctx.db.insert('progressUpdates', {
            objective: args.objective,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            comment: args.comment,
            createdAt: now,
            updatedAt: now,
        });

        const unitSuffix = objective.unit ? ` ${objective.unit}` : '';
        const progressMode = objective.progressMode ?? 'cumulative';
        const sign = args.updatedValue >= 0 ? '+' : '';
        const progressValueLabel =
            progressMode === 'snapshot'
                ? `${args.updatedValue}${unitSuffix}`
                : `${sign}${args.updatedValue}${unitSuffix}`;
        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            notificationDate: now,
            message: `Progress updated for ${objective.title} (${progressValueLabel}).`,
            createdAt: now,
            updatedAt: now,
        });

        // Check for achievements after progress update
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.userId,
                trigger: 'progress_update',
            });
        }

        const currentValue = await syncObjectiveCurrentValue(ctx, args.objective);

        if (currentValue !== null) {
            const completionState = await syncObjectiveCompletionState(ctx, args.objective, currentValue);
            if (
                completionState.completedNow &&
                !process.env.VITEST &&
                process.env.NODE_ENV !== 'test'
            ) {
                await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                    userId: objective.userId,
                    trigger: 'objective_completed',
                });
            }
        }

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

export const updateUpdateProgress = mutationWithRLS({
    args: {
        id: v.id('progressUpdates'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        const existing = await ctx.db.get('progressUpdates', id);
        if (!existing) {
            throw new Error('Progress update not found');
        }
        const objective = await ctx.db.get('objectives', existing.objective);
        if (!objective) {
            throw new Error('Objective not found');
        }
        if (objective.status === 'archived' || objective.status === 'deleted') {
            throw new Error('Cannot update progress for a closed objective');
        }

        await ctx.db.patch('progressUpdates', id, { ...rest, updatedAt: Date.now() });

        const currentValue = await syncObjectiveCurrentValue(ctx, existing.objective);
        if (currentValue !== null) {
            const completionState = await syncObjectiveCompletionState(
                ctx,
                existing.objective,
                currentValue
            );
            if (
                completionState.completedNow &&
                !process.env.VITEST &&
                process.env.NODE_ENV !== 'test'
            ) {
                await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                    userId: objective.userId,
                    trigger: 'objective_completed',
                });
            }
        }

        return await ctx.db.get('progressUpdates', id);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: { _id: v.id('progressUpdates') },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('progressUpdates', args._id);
        const objective = existing ? await ctx.db.get('objectives', existing.objective) : null;
        if (objective && (objective.status === 'archived' || objective.status === 'deleted')) {
            throw new Error('Cannot delete progress for a closed objective');
        }

        await ctx.db.delete('progressUpdates', args._id);

        if (objective) {
            const currentValue = await syncObjectiveCurrentValue(ctx, objective._id);
            if (currentValue !== null) {
                const completionState = await syncObjectiveCompletionState(
                    ctx,
                    objective._id,
                    currentValue
                );
                if (
                    completionState.completedNow &&
                    !process.env.VITEST &&
                    process.env.NODE_ENV !== 'test'
                ) {
                    await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                        userId: objective.userId,
                        trigger: 'objective_completed',
                    });
                }
            }
        }

        return 'Update progress deleted successfully' as const;
    },
});
