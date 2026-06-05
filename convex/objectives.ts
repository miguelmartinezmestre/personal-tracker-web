import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { objectiveStatusValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import { withInvalidCursorRetry } from './utils/pagination';
import { validateObjectiveMetrics } from './domain/objectives/metrics';
import { getCategoryForObjective } from './domain/objectives/categoryResolution';
import { deadlineRangeValidator } from './domain/objectives/filters';
import { runObjectiveSync } from './domain/objectives/workflowSync';
import { workflow } from './workflow';
import { listObjectives, searchObjectives } from './domain/objectives/list';
import {
    continueObjectiveDeletion,
    deleteObjectiveWithDependents,
} from './jobs/objectives/deleteObjective';
import { isGlobalAdminRole } from '../shared/platform-roles';

function assertCanModifyObjective(
    ctx: { userId: Id<'user'>; organizationId: Id<'organization'> | null; role: string },
    objective: { organizationId: Id<'organization'> }
): void {
    const isGlobalAdmin = isGlobalAdminRole(ctx.role);
    if (isGlobalAdmin) return;

    if (!ctx.organizationId || objective.organizationId !== ctx.organizationId) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
    }
}

export const getObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        categoryId: v.optional(v.id('categories')),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, { paginationOpts, status, categoryId, deadlineRange }) => {
        return await withInvalidCursorRetry(paginationOpts, retryPaginationOpts =>
            listObjectives(ctx, {
                paginationOpts: retryPaginationOpts,
                status,
                categoryId,
                deadlineRange,
            })
        );
    },
});

export const searchObjectivesQuery = queryWithRLS({
    args: {
        search: v.string(),
        limit: v.optional(v.number()),
        status: v.optional(objectiveStatusValidator),
        categoryId: v.optional(v.id('categories')),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, args) => {
        return await searchObjectives(ctx, args);
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get('objectives', args.id);
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        targetValue: v.number(),
        currentValue: v.optional(v.number()),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        unit: v.optional(v.string()),
    },
    returns: v.id('objectives'),
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const now = Date.now();
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        if (args.title.trim() === '') {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const startValue = args.startValue ?? args.currentValue ?? 0;
        validateObjectiveMetrics({
            targetValue: args.targetValue,
            currentValue: startValue,
            startValue,
            deadline: args.deadline,
        });

        let resolvedCategoryId: Id<'categories'> | undefined;

        if (args.categoryId) {
            const category = await getCategoryForObjective(ctx, organizationId, args.categoryId);
            resolvedCategoryId = category._id;
        }

        const objectiveId = await ctx.db.insert('objectives', {
            userId,
            organizationId,
            title: args.title,
            description: args.description,
            categoryId: resolvedCategoryId,
            targetValue: args.targetValue,
            currentValue: startValue,
            startValue,
            deadline: args.deadline,
            status: startValue >= args.targetValue ? 'completed' : 'active',
            unit: args.unit,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId,
            organizationId,
            trigger: 'objective_created',
        });

        await runObjectiveSync(ctx, objectiveId, userId, organizationId, 'objective');
        return objectiveId;
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryId: v.optional(v.union(v.id('categories'), v.null())),
        targetValue: v.optional(v.number()),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        unit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        assertCanModifyObjective(ctx, objective);

        if (args.title !== undefined && args.title.trim() === '') {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        validateObjectiveMetrics({
            targetValue: args.targetValue,
            startValue: args.startValue,
            deadline: args.deadline,
        });

        // categoryId: an id sets/changes the category, null clears it, undefined leaves it as-is.
        let resolvedCategoryId: Id<'categories'> | undefined;
        if (args.categoryId) {
            const category = await getCategoryForObjective(
                ctx,
                objective.organizationId,
                args.categoryId
            );
            resolvedCategoryId = category._id;
        }

        const patch: Partial<{
            title: string;
            description: string | undefined;
            categoryId: Id<'categories'> | undefined;
            targetValue: number;
            startValue: number;
            deadline: number;
            unit: string;
            updatedAt: number;
        }> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) patch.title = args.title;
        if (args.description !== undefined) patch.description = args.description;
        if (args.categoryId !== undefined) patch.categoryId = resolvedCategoryId;
        if (args.targetValue !== undefined) patch.targetValue = args.targetValue;
        if (args.startValue !== undefined) patch.startValue = args.startValue;
        if (args.deadline !== undefined) patch.deadline = args.deadline;
        if (args.unit !== undefined) patch.unit = args.unit;

        await ctx.db.patch('objectives', args.id, patch);

        await runObjectiveSync(ctx, args.id, objective.userId, ctx.organizationId, 'objective');
        return await ctx.db.get('objectives', args.id);
    },
});

export const deleteObjectiveContinue = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        phase: v.optional(v.union(v.literal('progress'), v.literal('notifications'))),
        cursor: v.optional(v.union(v.string(), v.null())),
        totalProgressDeleted: v.optional(v.number()),
        totalNotificationsDeleted: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await continueObjectiveDeletion(ctx, args);
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    returns: v.object({
        status: v.string(),
        objectiveId: v.id('objectives'),
        deleted: v.optional(
            v.object({
                progress: v.number(),
                notifications: v.number(),
            })
        ),
    }),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        assertCanModifyObjective(ctx, objective);

        if (objective.workflowId) {
            await workflow.cancel(ctx, objective.workflowId);
        }

        return await deleteObjectiveWithDependents(ctx, { objectiveId: args.id });
    },
});
