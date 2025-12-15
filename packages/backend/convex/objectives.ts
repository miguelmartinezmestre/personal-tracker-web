import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';

export const getObjectivesByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        console.log('getObjectivesByUser');
        return await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', String(ctx.identity?.subject)))
            .collect();
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
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
    },
    handler: async (ctx, args) => {
        const now = Date.now();
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
