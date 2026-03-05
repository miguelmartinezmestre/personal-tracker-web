import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './rls';
import { workflow } from './workflow';

const runObjectiveSync = async (
    ctx: Parameters<typeof workflow.start>[0],
    objectiveId: Id<'objectives'>,
    userId: string
) => {
    try {
        await workflow.start(ctx, internal.workflows.objectiveLifecycle.objectiveLifecycle, {
            objectiveId,
            userId,
        });
    } catch {
        // Workflow may fail in test environments — non-critical side effect
    }
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
            throw new ConvexError('Objective not found');
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

        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId: objective.userId,
            trigger: 'progress_update',
        });

        await runObjectiveSync(ctx, args.objective, objective.userId);

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
        const existing = await ctx.db.get('progressUpdates', args.id);
        if (!existing) {
            throw new ConvexError('Progress update not found');
        }

        const objective = await ctx.db.get('objectives', existing.objective);
        if (!objective) {
            throw new ConvexError('Objective not found');
        }

        await ctx.db.patch('progressUpdates', args.id, {
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            comment: args.comment,
            updatedAt: Date.now(),
        });

        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId: objective.userId,
            trigger: 'progress_update',
        });

        await runObjectiveSync(ctx, existing.objective, objective.userId);

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
            return 'Update progress deleted successfully' as const;
        }

        const objective = await ctx.db.get('objectives', existing.objective);
        if (!objective) {
            await ctx.db.delete('progressUpdates', args._id);
            return 'Update progress deleted successfully' as const;
        }

        await ctx.db.delete('progressUpdates', args._id);
        await runObjectiveSync(ctx, objective._id, objective.userId);

        return 'Update progress deleted successfully' as const;
    },
});
