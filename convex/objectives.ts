import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './rls';
import { objectiveScopeValidator, objectiveStatusValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import { validateObjectiveMetrics } from './domain/objectives/metrics';
import {
    findCategoryIdByName,
    getCategoryForObjective,
} from './domain/objectives/categoryResolution';
import { deadlineRangeValidator } from './domain/objectives/filters';
import { runObjectiveSync } from './domain/objectives/workflowSync';
import { buildObjectiveSearchText } from './domain/objectives/searchText';
import { workflow } from './workflow';
import { isVitestRuntime } from './utils/testRuntime';
import { listObjectives, searchObjectives } from './domain/objectives/list';
import { backfillObjectiveCategoryIdsJob } from './jobs/objectives/backfillCategoryIds';
import {
    continueObjectiveDeletion,
    deleteObjectiveWithDependents,
} from './jobs/objectives/deleteObjective';

function assertCanModifyObjective(
    ctx: { userId: Id<'user'>; organizationId: Id<'organization'> | null; role: string },
    objective: { userId: Id<'user'>; organizationId: Id<'organization'>; scope: string }
): void {
    const isGlobalAdmin = ctx.role === 'admin';

    if (objective.scope === 'personal') {
        if (objective.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }
        return;
    }

    if (objective.scope === 'organization') {
        if (isGlobalAdmin) return;
        if (!ctx.organizationId || objective.organizationId !== ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }
        return;
    }

    throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
}

export const getObjectivesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, { paginationOpts, status, category, deadlineRange }) => {
        return await listObjectives(ctx, {
            section: 'personal',
            paginationOpts,
            status,
            category,
            deadlineRange,
        });
    },
});

export const getOrganizationObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, { paginationOpts, status, category, deadlineRange }) => {
        return await listObjectives(ctx, {
            section: 'organization',
            paginationOpts,
            status,
            category,
            deadlineRange,
        });
    },
});

export const searchObjectivesByUser = queryWithRLS({
    args: {
        search: v.string(),
        limit: v.optional(v.number()),
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, args) => {
        return await searchObjectives(ctx, {
            section: 'personal',
            ...args,
        });
    },
});

export const searchOrganizationObjectives = queryWithRLS({
    args: {
        search: v.string(),
        limit: v.optional(v.number()),
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, args) => {
        return await searchObjectives(ctx, {
            section: 'organization',
            ...args,
        });
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
        category: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        targetValue: v.number(),
        currentValue: v.optional(v.number()),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        unit: v.optional(v.string()),
        scope: v.optional(objectiveScopeValidator),
    },
    returns: v.id('objectives'),
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const now = Date.now();
        const scope = args.scope ?? 'personal';
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        if (scope === 'organization' && !organizationId) {
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

        let resolvedCategory: string | undefined;
        let resolvedCategoryId: Id<'categories'> | undefined;

        if (args.categoryId) {
            const category = await getCategoryForObjective(ctx, organizationId, args.categoryId);
            resolvedCategoryId = category._id;
            resolvedCategory = category.name;
        } else if (args.category !== undefined && args.category.trim() !== '') {
            const trimmed = args.category.trim();
            resolvedCategory = trimmed;
            resolvedCategoryId = await findCategoryIdByName(ctx, organizationId, trimmed);
        }

        const objectiveId = await ctx.db.insert('objectives', {
            userId,
            organizationId,
            scope,
            title: args.title,
            description: args.description,
            searchText: buildObjectiveSearchText({
                title: args.title,
                description: args.description,
                category: resolvedCategory,
            }),
            category: resolvedCategory,
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

        if (!isVitestRuntime()) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId,
                organizationId,
                trigger: 'objective_created',
            });
        }

        await runObjectiveSync(ctx, objectiveId, userId, organizationId, 'objective');
        return objectiveId;
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        targetValue: v.optional(v.number()),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        unit: v.optional(v.string()),
        scope: v.optional(objectiveScopeValidator),
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

        if (args.scope === 'organization' && !ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        let categoryPatch:
            | { category: string | undefined; categoryId: Id<'categories'> | undefined }
            | undefined;

        if (args.categoryId !== undefined) {
            const category = await getCategoryForObjective(
                ctx,
                objective.organizationId,
                args.categoryId
            );
            categoryPatch = { category: category.name, categoryId: category._id };
        } else if (args.category !== undefined) {
            const trimmed = args.category.trim();
            if (trimmed === '') {
                categoryPatch = { category: undefined, categoryId: undefined };
            } else {
                categoryPatch = {
                    category: trimmed,
                    categoryId: await findCategoryIdByName(ctx, objective.organizationId, trimmed),
                };
            }
        }

        const patch: Partial<{
            title: string;
            description: string | undefined;
            searchText: string;
            category: string | undefined;
            categoryId: Id<'categories'> | undefined;
            targetValue: number;
            startValue: number;
            deadline: number;
            unit: string;
            scope: 'personal' | 'organization';
            updatedAt: number;
        }> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) patch.title = args.title;
        if (args.description !== undefined) patch.description = args.description;
        if (categoryPatch !== undefined) {
            patch.category = categoryPatch.category;
            patch.categoryId = categoryPatch.categoryId;
        }
        if (args.targetValue !== undefined) patch.targetValue = args.targetValue;
        if (args.startValue !== undefined) patch.startValue = args.startValue;
        if (args.deadline !== undefined) patch.deadline = args.deadline;
        if (args.unit !== undefined) patch.unit = args.unit;
        if (args.scope !== undefined) patch.scope = args.scope;

        if (
            args.title !== undefined ||
            args.description !== undefined ||
            categoryPatch !== undefined
        ) {
            patch.searchText = buildObjectiveSearchText({
                title: args.title ?? objective.title,
                description: args.description ?? objective.description,
                category: categoryPatch !== undefined ? categoryPatch.category : objective.category,
            });
        }

        await ctx.db.patch('objectives', args.id, patch);

        await runObjectiveSync(ctx, args.id, objective.userId, ctx.organizationId, 'objective');
        return await ctx.db.get('objectives', args.id);
    },
});

export const backfillObjectiveCategoryIds = internalMutation({
    args: {
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await backfillObjectiveCategoryIdsJob(ctx, args);
    },
});

export const backfillObjectiveSearchText = internalMutation({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    returns: v.object({
        patched: v.number(),
        isDone: v.boolean(),
        continueCursor: v.string(),
    }),
    handler: async (ctx, args) => {
        const page = await ctx.db.query('objectives').paginate({
            numItems: 100,
            cursor: args.cursor ?? null,
        });
        let patched = 0;

        for (const objective of page.page) {
            const searchText = buildObjectiveSearchText(objective);
            if (objective.searchText !== searchText) {
                await ctx.db.patch('objectives', objective._id, { searchText });
                patched += 1;
            }
        }

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.objectives.backfillObjectiveSearchText, {
                cursor: page.continueCursor,
            });
        }

        return {
            patched,
            isDone: page.isDone,
            continueCursor: page.continueCursor,
        };
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
