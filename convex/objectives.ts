import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './rls';
import { objectiveScopeValidator, objectiveStatusValidator } from './utils/validators';
import { workflow } from './workflow';
import { ERROR_CODES } from './utils/constants';
import { validateObjectiveMetrics } from './utils/objectiveDomain';
import { findCategoryIdByName, getCategoryForObjective } from './utils/categoryResolution';

const BATCH_SIZE = 50;

const EMPTY_PAGE = {
    page: [],
    continueCursor: '',
    isDone: true,
};

const runObjectiveSync = async (
    ctx: Parameters<typeof workflow.start>[0],
    objectiveId: Id<'objectives'>,
    userId: Id<'user'>,
    organizationId?: Id<'organization'> | null
) => {
    try {
        await workflow.start(ctx, internal.workflows.objectiveLifecycle.objectiveLifecycle, {
            objectiveId,
            userId,
        });
    } catch (error) {
        if (organizationId) {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                organizationId,
                action: 'WORKFLOW_ERROR',
                resourceType: 'objective',
                resourceId: objectiveId,
                metadata: {
                    context: `Objective lifecycle workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                severity: 'warning',
            });
        }
    }
};

export const getObjectivesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
    },
    handler: async (ctx, { paginationOpts, status, category }) => {
        const userId = ctx.userId;

        if (status) {
            const query = ctx.db
                .query('objectives')
                .withIndex('by_user_scope_status', q =>
                    q.eq('userId', userId).eq('scope', 'personal').eq('status', status)
                )
                .order('desc');

            if (category && category !== 'all') {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user_scope_status_category', q =>
                        q
                            .eq('userId', userId)
                            .eq('scope', 'personal')
                            .eq('status', status)
                            .eq('category', category)
                    )
                    .order('desc')
                    .paginate(paginationOpts);
            }

            return await query.paginate(paginationOpts);
        }

        const query = ctx.db
            .query('objectives')
            .withIndex('by_user_scope', q => q.eq('userId', userId).eq('scope', 'personal'))
            .order('desc');

        if (category && category !== 'all') {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_scope_category', q =>
                    q.eq('userId', userId).eq('scope', 'personal').eq('category', category)
                )
                .order('desc')
                .paginate(paginationOpts);
        }

        return await query.paginate(paginationOpts);
    },
});

export const getOrganizationObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
    },
    handler: async (ctx, { paginationOpts, status, category }) => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return EMPTY_PAGE;
        }

        if (status) {
            const query = ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status', q =>
                    q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', status)
                )
                .order('desc');

            if (category && category !== 'all') {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_organization_scope_status_category', q =>
                        q
                            .eq('organizationId', organizationId)
                            .eq('scope', 'organization')
                            .eq('status', status)
                            .eq('category', category)
                    )
                    .order('desc')
                    .paginate(paginationOpts);
            }

            return await query.paginate(paginationOpts);
        }

        const query = ctx.db
            .query('objectives')
            .withIndex('by_organization_scope', q =>
                q.eq('organizationId', organizationId).eq('scope', 'organization')
            )
            .order('desc');

        if (category && category !== 'all') {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_category', q =>
                    q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('category', category)
                )
                .order('desc')
                .paginate(paginationOpts);
        }

        return await query.paginate(paginationOpts);
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
            const cat = await getCategoryForObjective(ctx, organizationId, userId, args.categoryId);
            resolvedCategoryId = cat._id;
            resolvedCategory = cat.name;
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

        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId,
            organizationId,
            trigger: 'objective_created',
        });

        await runObjectiveSync(ctx, objectiveId, userId, organizationId);
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

        if (objective.scope === 'personal' && objective.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
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
            const cat = await getCategoryForObjective(
                ctx,
                objective.organizationId,
                ctx.userId,
                args.categoryId
            );
            categoryPatch = { category: cat.name, categoryId: cat._id };
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

        await ctx.db.patch('objectives', args.id, {
            title: args.title,
            description: args.description,
            ...(categoryPatch !== undefined
                ? {
                      category: categoryPatch.category,
                      categoryId: categoryPatch.categoryId,
                  }
                : {}),
            targetValue: args.targetValue,
            startValue: args.startValue,
            deadline: args.deadline,
            unit: args.unit,
            scope: args.scope,
            updatedAt: Date.now(),
        });

        await runObjectiveSync(ctx, args.id, objective.userId, ctx.organizationId);
        return await ctx.db.get('objectives', args.id);
    },
});

export const backfillObjectiveCategoryIds = internalMutation({
    args: {
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const BATCH = 100;
        const page = await ctx.db.query('objectives').paginate({
            numItems: BATCH,
            cursor: args.cursor ?? null,
        });

        for (const objective of page.page) {
            if (objective.categoryId || !objective.category?.trim()) continue;
            const cid = await findCategoryIdByName(
                ctx,
                objective.organizationId,
                objective.category
            );
            if (cid) {
                await ctx.db.patch(objective._id, { categoryId: cid });
            }
        }

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.objectives.backfillObjectiveCategoryIds, {
                cursor: page.continueCursor,
            });
        }
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
        const phase = args.phase ?? 'progress';
        const totalProgressDeleted = args.totalProgressDeleted ?? 0;
        const totalNotificationsDeleted = args.totalNotificationsDeleted ?? 0;
        const objective = await ctx.db.get(args.objectiveId);

        if (!objective) {
            return {
                status: 'completed',
                noOp: true,
                deleted: {
                    progress: totalProgressDeleted,
                    notifications: totalNotificationsDeleted,
                },
            };
        }

        if (phase === 'progress') {
            const page = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
                .paginate({
                    numItems: BATCH_SIZE,
                    cursor: null,
                });

            for (const update of page.page) {
                await ctx.db.delete(update._id);
            }

            const newTotalProgress = totalProgressDeleted + page.page.length;

            if (!page.isDone) {
                await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                    objectiveId: args.objectiveId,
                    phase: 'progress',
                    cursor: null,
                    totalProgressDeleted: newTotalProgress,
                    totalNotificationsDeleted,
                });
                return {
                    status: 'in_progress',
                    phase: 'progress',
                    deleted: {
                        progress: newTotalProgress,
                        notifications: totalNotificationsDeleted,
                    },
                };
            }

            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                phase: 'notifications',
                cursor: null,
                totalProgressDeleted: newTotalProgress,
                totalNotificationsDeleted,
            });
            return {
                status: 'in_progress',
                phase: 'notifications',
                deleted: { progress: newTotalProgress, notifications: totalNotificationsDeleted },
            };
        }

        const page = await ctx.db
            .query('notifications')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .paginate({
                numItems: BATCH_SIZE,
                cursor: null,
            });

        for (const notification of page.page) {
            await ctx.db.delete(notification._id);
        }

        const newTotalNotifications = totalNotificationsDeleted + page.page.length;

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                phase: 'notifications',
                cursor: null,
                totalProgressDeleted,
                totalNotificationsDeleted: newTotalNotifications,
            });
            return {
                status: 'in_progress',
                phase: 'notifications',
                deleted: {
                    progress: totalProgressDeleted,
                    notifications: newTotalNotifications,
                },
            };
        }

        await ctx.db.delete(args.objectiveId);

        return {
            status: 'completed',
            deleted: { progress: totalProgressDeleted, notifications: newTotalNotifications },
        };
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        if (objective.scope === 'personal' && objective.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        if (objective.scope === 'organization' && objective.organizationId !== ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.id,
            phase: 'progress',
            cursor: null,
            totalProgressDeleted: 0,
            totalNotificationsDeleted: 0,
        });

        return { status: 'deletion_started', objectiveId: args.id };
    },
});
