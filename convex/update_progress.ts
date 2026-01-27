import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import type { MutationCtx } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

type PeriodRange = { start: number; end: number };

const DAY_MS = 24 * 60 * 60 * 1000;

const getPeriodRange = (
    period: string | undefined,
    now: number,
    periodStart?: number,
    periodLengthDays?: number
): PeriodRange | null => {
    if (!period || period === 'none') return null;

    const date = new Date(now);
    switch (period) {
        case 'weekly': {
            const day = date.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() + diffToMonday);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'monthly': {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'custom': {
            if (!periodStart || !periodLengthDays || periodLengthDays <= 0) return null;
            const lengthMs = periodLengthDays * DAY_MS;
            if (now < periodStart) {
                return { start: periodStart, end: periodStart + lengthMs };
            }
            const cycles = Math.floor((now - periodStart) / lengthMs);
            const start = periodStart + cycles * lengthMs;
            return { start, end: start + lengthMs };
        }
        default:
            return null;
    }
};

const calculateCurrentValue = (
    objective: {
        currentValue: number;
        objectiveType?: string;
        period?: string;
        periodStart?: number;
        periodLengthDays?: number;
    },
    updates: { updatedValue: number; updateDate: number }[]
) => {
    if (updates.length === 0) {
        return objective.currentValue;
    }

    const objectiveType = objective.objectiveType ?? 'value';
    const period = objective.period ?? 'none';
    const isEventBased = objectiveType !== 'value' || period !== 'none';

    if (!isEventBased) {
        const latestUpdate = updates.reduce((latest, update) =>
            update.updateDate > latest.updateDate ? update : latest
        );
        return latestUpdate.updatedValue;
    }

    const range = getPeriodRange(period, Date.now(), objective.periodStart, objective.periodLengthDays);
    const relevantUpdates = range
        ? updates.filter(update => update.updateDate >= range.start && update.updateDate < range.end)
        : updates;

    if (relevantUpdates.length === 0) {
        return 0;
    }

    return relevantUpdates.reduce((sum, update) => sum + update.updatedValue, 0);
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

    const currentValue = calculateCurrentValue(objective, updates);
    await ctx.db.patch('objectives', objectiveId, {
        currentValue,
        updatedAt: Date.now(),
    });

    return currentValue;
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
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            notificationDate: now,
            message: `Progress updated for ${objective.title} (+${args.updatedValue}${unitSuffix}).`,
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

        await syncObjectiveCurrentValue(ctx, args.objective);

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

        await ctx.db.patch('progressUpdates', id, { ...rest, updatedAt: Date.now() });

        await syncObjectiveCurrentValue(ctx, existing.objective);

        return await ctx.db.get('progressUpdates', id);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: { _id: v.id('progressUpdates') },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('progressUpdates', args._id);
        const objective = existing ? await ctx.db.get('objectives', existing.objective) : null;

        await ctx.db.delete('progressUpdates', args._id);

        if (objective) {
            await syncObjectiveCurrentValue(ctx, objective._id);
        }

        return 'Update progress deleted successfully' as const;
    },
});
