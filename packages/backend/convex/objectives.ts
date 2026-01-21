/**
 * Objectives Queries and General Updates
 *
 * This file contains query functions for objectives.
 * Status-changing mutations are in objectivePublic.ts
 */

import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';

export {
    createObjective,
    pauseObjective,
    resumeObjective,
    completeObjective,
    archiveObjective,
    deleteObjective,
    hardDeleteObjective,
    reconfigureObjective,
} from './objectivePublic';

/**
 * Get objectives for the current user with pagination
 */
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

        return results;
    },
});

/**
 * Get a single objective by ID
 */
export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const result = await ctx.db.get('objectives', args.id);
        return result;
    },
});

/**
 * Get objectives by status
 */
export const getObjectivesByStatus = queryWithRLS({
    args: {
        status: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { status, paginationOpts }) => {
        const userId = String(ctx.identity?.subject);
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.eq(q.field('status'), status))
            .order('desc')
            .paginate(paginationOpts);

        return results;
    },
});

/**
 * Update objective fields (non-status updates)
 * For status changes, use the mutations in objectivePublic.ts
 */
export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
        currentValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
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
