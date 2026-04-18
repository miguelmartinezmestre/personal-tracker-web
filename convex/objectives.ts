import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './rls';
import { objectiveScopeValidator, objectiveStatusValidator } from './utils/validators';
import { workflow } from './workflow';
import { ERROR_CODES } from './utils/constants';

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
        const objectiveId = await ctx.db.insert('objectives', {
            userId,
            organizationId,
            scope,
            title: args.title,
            description: args.description,
            category: args.category,
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

        if (args.scope === 'organization' && !ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        await ctx.db.patch('objectives', args.id, {
            title: args.title,
            description: args.description,
            category: args.category,
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

export const deleteObjectiveContinue = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        skipProgress: v.number(),
        skipNotifications: v.number(),
    },
    handler: async (ctx, args) => {
        let totalProgressDeleted = args.skipProgress;
        let totalNotificationsDeleted = args.skipNotifications;

        // Delete next batch of progressUpdates
        const progressUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .take(BATCH_SIZE);

        for (const update of progressUpdates) {
            await ctx.db.delete('progressUpdates', update._id);
        }

        totalProgressDeleted += progressUpdates.length;

        // If there are more progressUpdates, continue
        if (progressUpdates.length === BATCH_SIZE) {
            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                skipProgress: totalProgressDeleted,
                skipNotifications: args.skipNotifications,
            });
            return {
                status: 'in_progress',
                deleted: { progress: totalProgressDeleted, notifications: args.skipNotifications },
            };
        }

        // ProgressUpdates done, now delete notifications in batches
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .take(BATCH_SIZE);

        for (const notification of notifications) {
            await ctx.db.delete('notifications', notification._id);
        }

        totalNotificationsDeleted += notifications.length;

        // If there are more notifications, continue
        if (notifications.length === BATCH_SIZE) {
            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                skipProgress: totalProgressDeleted,
                skipNotifications: totalNotificationsDeleted,
            });
            return {
                status: 'in_progress',
                deleted: {
                    progress: totalProgressDeleted,
                    notifications: totalNotificationsDeleted,
                },
            };
        }

        // All related data deleted, now delete the objective itself
        await ctx.db.delete('objectives', args.objectiveId);

        return {
            status: 'completed',
            deleted: { progress: totalProgressDeleted, notifications: totalNotificationsDeleted },
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

        // Check permissions
        if (objective.scope === 'personal' && objective.userId !== ctx.userId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        if (objective.scope === 'organization' && objective.organizationId !== ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        // Start batch deletion process
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.id,
            skipProgress: 0,
            skipNotifications: 0,
        });

        return { status: 'deletion_started', objectiveId: args.id };
    },
});
