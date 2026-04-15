import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './rls';
import { objectiveScopeValidator, objectiveStatusValidator } from './utils/validators';
import { workflow } from './workflow';
import { ERROR_CODES } from './utils/constants';

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
                return await query
                    .filter(q => q.eq(q.field('category'), category))
                    .paginate(paginationOpts);
            }

            return await query.paginate(paginationOpts);
        }

        const query = ctx.db
            .query('objectives')
            .withIndex('by_user_scope', q =>
                q.eq('userId', userId).eq('scope', 'personal')
            )
            .order('desc');

        if (category && category !== 'all') {
            return await query
                .filter(q => q.eq(q.field('category'), category))
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
                    q.eq('organizationId', organizationId).eq('scope', 'organization').eq('status', status)
                )
                .order('desc');

            if (category && category !== 'all') {
                return await query
                    .filter(q => q.eq(q.field('category'), category))
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
            return await query
                .filter(q => q.eq(q.field('category'), category))
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

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        const progressUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', args.id))
            .collect();

        for (const progressUpdate of progressUpdates) {
            await ctx.db.delete('progressUpdates', progressUpdate._id);
        }

        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_objective', q => q.eq('objective', args.id))
            .collect();

        for (const notification of notifications) {
            await ctx.db.delete('notifications', notification._id);
        }

        await ctx.db.delete('objectives', args.id);
        return { success: true };
    },
});
