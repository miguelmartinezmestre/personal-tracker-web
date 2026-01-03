import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { getAuthenticatedUser } from './auth';
import { internal } from './_generated/api';

export const createUpdateProgress = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new Error('User not authenticated');

        const objective = await ctx.db.get(args.objective);
        if (!objective) {
            throw new Error('Objective not found');
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
        await ctx.db.insert('notifications', {
            user: objective.user,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            notificationDate: now,
            message: `Progress updated for \"${objective.title}\" (+${args.updatedValue}${unitSuffix}).`,
            createdAt: now,
            updatedAt: now,
        });

        // Check for achievements (streak, progress updates count)
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.user,
                trigger: 'progress_update',
            });
        }

        return await ctx.db.get(id);
    },
});

export const getUpdateProgressByObjectiveId = queryWithRLS({
    args: { objectiveId: v.id('objectives') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .collect();
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
        await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
        return await ctx.db.get(id);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: { _id: v.id('progressUpdates') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args._id);
        return 'Update progress deleted successfully' as const;
    },
});
