import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';

export const getObjectivesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', String(ctx.identity?.subject)))
            .order('desc')
            .paginate(paginationOpts);

        return results
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const result = await ctx.db.get('objectives', args.id);

        return result;
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

        const objectiveId = await ctx.db.insert('objectives', {
            userId: String(ctx.identity?.subject),
            organizationId: ctx.organizationId,
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

        return objectiveId;
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
        const existing = await ctx.db.get('objectives', id);
        if (!existing) {
            throw new Error('Objective not found');
        }

        const now = Date.now();
        const updated = await ctx.db.patch('objectives', id, { ...rest, updatedAt: now });

        return updated;
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const result = await ctx.db.delete('objectives', args.id);

        return result;
    },
});

