import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { Doc } from './_generated/dataModel';

const DAY_MS = 24 * 60 * 60 * 1000;

type ObjectiveWithPeriod = Doc<'objectives'> & {
    objectiveType?: string;
    period?: string;
    periodStart?: number;
    periodLengthDays?: number;
};

const getPeriodRange = (
    period: string | undefined,
    now: number,
    periodStart?: number,
    periodLengthDays?: number
) => {
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

const isEventBasedObjective = (objectiveType?: string, period?: string) => {
    if (objectiveType && objectiveType !== 'value') return true;
    return !!(period && period !== 'none');
};

const sumUpdates = (updates: { updatedValue: number }[]) =>
    updates.reduce((total, update) => total + update.updatedValue, 0);

export const getObjectivesByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        console.log('getObjectivesByUser');
        const objectives = (await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', String(ctx.identity?.subject)))
            .collect()) as ObjectiveWithPeriod[];

        const now = Date.now();

        return await Promise.all(
            objectives.map(async objective => {
                const objectiveType = objective.objectiveType ?? 'value';
                const period = objective.period ?? 'none';

                if (!isEventBasedObjective(objectiveType, period)) {
                    return objective;
                }

                const range = getPeriodRange(
                    period,
                    now,
                    objective.periodStart,
                    objective.periodLengthDays
                );

                const updates = range
                    ? await ctx.db
                          .query('progressUpdates')
                          .withIndex('by_objective_date', q =>
                              q
                                  .eq('objective', objective._id)
                                  .gte('updateDate', range.start)
                                  .lt('updateDate', range.end)
                          )
                          .collect()
                    : await ctx.db
                          .query('progressUpdates')
                          .withIndex('by_objective', q => q.eq('objective', objective._id))
                          .collect();

                return {
                    ...objective,
                    currentValue: sumUpdates(updates),
                };
            })
        );
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = (await ctx.db.get(args.id)) as ObjectiveWithPeriod | null;
        if (!objective) return null;

        const objectiveType = objective.objectiveType ?? 'value';
        const period = objective.period ?? 'none';
        if (!isEventBasedObjective(objectiveType, period)) {
            return objective;
        }

        const now = Date.now();
        const range = getPeriodRange(
            period,
            now,
            objective.periodStart,
            objective.periodLengthDays
        );

        const updates = range
            ? await ctx.db
                  .query('progressUpdates')
                  .withIndex('by_objective_date', q =>
                      q
                          .eq('objective', objective._id)
                          .gte('updateDate', range.start)
                          .lt('updateDate', range.end)
                  )
                  .collect()
            : await ctx.db
                  .query('progressUpdates')
                  .withIndex('by_objective', q => q.eq('objective', objective._id))
                  .collect();

        return {
            ...objective,
            currentValue: sumUpdates(updates),
        };
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(),
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const objectiveType = args.objectiveType ?? 'value';
        const period = args.period ?? 'none';

        return await ctx.db.insert('objectives', {
            user: String(ctx.identity?.subject),
            title: args.title,
            description: args.description,
            category: args.category,
            targetValue: args.targetValue,
            currentValue: args.currentValue,
            deadline: args.deadline,
            status: args.status,
            unit: args.unit,
            objectiveType,
            period,
            periodStart: args.periodStart,
            periodLengthDays: args.periodLengthDays,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
        currentValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: v.optional(v.string()),
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        return await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

export const updateObjectiveStatus = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const { id, status } = args;
        return await ctx.db.patch(id, {
            status,
            updatedAt: Date.now(),
        });
    },
});

export const completeObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        return await ctx.db.patch(args.id, {
            status: 'completed',
            currentValue: objective.targetValue,
            updatedAt: Date.now(),
        });
    },
});

export const archiveObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.id, {
            status: 'archived',
            updatedAt: Date.now(),
        });
    },
});

export const pauseObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.id, {
            status: 'paused',
            updatedAt: Date.now(),
        });
    },
});
