import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import {
    objectiveCollaboratorRoleValidator,
    objectiveStatusValidator,
    objectiveVisibilityValidator,
} from './utils/validators';
import { ERROR_CODES, OBJECTIVE_VISIBILITY } from './utils/constants';
import { withInvalidCursorRetry } from './utils/pagination';
import { validateObjectiveMetrics } from './domain/objectives/metrics';
import { getCategoryForObjective } from './domain/objectives/access';
import { deadlineRangeValidator } from './domain/objectives/filters';
import { runObjectiveSync } from './domain/objectives/workflowSync';
import { workflow } from './workflow';
import { listObjectives, searchObjectives } from './domain/objectives/list';
import {
    continueObjectiveDeletion,
    deleteObjectiveWithDependents,
} from './jobs/objectives/deleteObjective';
import {
    assertObjectiveAction,
    enrichObjectiveWithCapabilities,
    resolveObjectiveCapabilities,
    type AccessCtx,
} from './domain/objectives/access';
import {
    addObjectiveCollaborator,
    listCollaboratorsForObjective,
    removeObjectiveCollaborator,
    updateObjectiveCollaboratorRole,
} from './domain/objectives/collaborators';

const objectiveCapabilitiesValidator = v.object({
    canView: v.boolean(),
    canEditDefinition: v.boolean(),
    canDelete: v.boolean(),
    canRestore: v.boolean(),
    canManageCollaborators: v.boolean(),
    canContribute: v.boolean(),
    canSetVisibility: v.boolean(),
    canTransfer: v.boolean(),
});

const objectiveWithCapabilitiesValidator = v.object({
    _id: v.id('objectives'),
    _creationTime: v.number(),
    organizationId: v.id('organization'),
    createdBy: v.id('user'),
    ownerId: v.id('user'),
    visibility: objectiveVisibilityValidator,
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    targetValue: v.number(),
    currentValue: v.number(),
    startValue: v.optional(v.number()),
    deadline: v.optional(v.number()),
    status: objectiveStatusValidator,
    completedAt: v.optional(v.number()),
    unit: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id('user')),
    createdAt: v.number(),
    updatedAt: v.number(),
    capabilities: objectiveCapabilitiesValidator,
});

async function enrichObjective(ctx: AccessCtx, objective: Doc<'objectives'>) {
    const capabilities = await resolveObjectiveCapabilities(ctx, objective);
    return enrichObjectiveWithCapabilities(objective, capabilities);
}

export const getObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        categoryId: v.optional(v.id('categories')),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, { paginationOpts, status, categoryId, deadlineRange }) => {
        const page = await withInvalidCursorRetry(paginationOpts, retryPaginationOpts =>
            listObjectives(ctx, {
                paginationOpts: retryPaginationOpts,
                status,
                categoryId,
                deadlineRange,
            })
        );

        const enrichedPage = await Promise.all(
            page.page.map(objective => enrichObjective(ctx, objective))
        );

        return {
            ...page,
            page: enrichedPage,
        };
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
        const results = await searchObjectives(ctx, args);
        return await Promise.all(results.map(objective => enrichObjective(ctx, objective)));
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    returns: v.union(objectiveWithCapabilitiesValidator, v.null()),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            return null;
        }
        return await enrichObjective(ctx, objective);
    },
});

export const getObjectiveCollaborators = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'view');

        const collaborators = await listCollaboratorsForObjective(ctx, args.objectiveId);
        const users = await Promise.all(collaborators.map(row => ctx.db.get('user', row.userId)));

        return collaborators.map((collaborator, index) => {
            const user = users[index];
            return {
                id: collaborator._id,
                objectiveId: collaborator.objectiveId,
                userId: collaborator.userId,
                role: collaborator.role,
                addedBy: collaborator.addedBy,
                createdAt: collaborator.createdAt,
                user: user
                    ? {
                          name: user.name,
                          email: user.email,
                          image: user.image,
                      }
                    : null,
            };
        });
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
        visibility: v.optional(objectiveVisibilityValidator),
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

        const isCompleted = startValue >= args.targetValue;

        const objectiveId = await ctx.db.insert('objectives', {
            createdBy: userId,
            ownerId: userId,
            visibility: args.visibility ?? OBJECTIVE_VISIBILITY.PRIVATE,
            organizationId,
            title: args.title,
            description: args.description,
            categoryId: resolvedCategoryId,
            targetValue: args.targetValue,
            currentValue: startValue,
            startValue,
            deadline: args.deadline,
            status: isCompleted ? 'completed' : 'active',
            completedAt: isCompleted ? now : undefined,
            unit: args.unit,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId,
            organizationId,
            trigger: 'objective_created',
        });

        if (isCompleted) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId,
                organizationId,
                trigger: 'objective_completed',
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

        await assertObjectiveAction(ctx, objective, 'editDefinition');

        if (args.title !== undefined && args.title.trim() === '') {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        validateObjectiveMetrics({
            targetValue: args.targetValue,
            startValue: args.startValue,
            deadline: args.deadline,
        });

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

        await runObjectiveSync(ctx, args.id, objective.createdBy, ctx.organizationId, 'objective');
        const updated = await ctx.db.get('objectives', args.id);
        if (!updated) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        return await enrichObjective(ctx, updated);
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    returns: v.object({
        status: v.string(),
        objectiveId: v.id('objectives'),
    }),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'delete');

        if (objective.workflowId) {
            await workflow.cancel(ctx, objective.workflowId);
        }

        const now = Date.now();
        await ctx.db.patch('objectives', args.id, {
            deletedAt: now,
            deletedBy: ctx.userId,
            updatedAt: now,
        });

        return {
            status: 'soft_deleted',
            objectiveId: args.id,
        };
    },
});

export const restoreObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'restore');

        await ctx.db.patch('objectives', args.id, {
            deletedAt: undefined,
            deletedBy: undefined,
            updatedAt: Date.now(),
        });

        await runObjectiveSync(ctx, args.id, objective.createdBy, ctx.organizationId, 'objective');
        const restored = await ctx.db.get('objectives', args.id);
        if (!restored) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        return await enrichObjective(ctx, restored);
    },
});

export const setObjectiveVisibility = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        visibility: objectiveVisibilityValidator,
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'setVisibility');

        await ctx.db.patch('objectives', args.id, {
            visibility: args.visibility,
            updatedAt: Date.now(),
        });

        const updated = await ctx.db.get('objectives', args.id);
        if (!updated) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        return await enrichObjective(ctx, updated);
    },
});

export const transferObjectiveOwnership = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        newOwnerId: v.id('user'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'transferOwnership');

        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', objective.organizationId).eq('userId', args.newOwnerId)
            )
            .first();

        if (!membership) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }

        const existingCollaborator = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_objective_user', q =>
                q.eq('objectiveId', args.id).eq('userId', args.newOwnerId)
            )
            .first();

        if (existingCollaborator) {
            await ctx.db.delete('objectiveCollaborators', existingCollaborator._id);
        }

        const now = Date.now();
        await ctx.db.patch('objectives', args.id, {
            ownerId: args.newOwnerId,
            updatedAt: now,
        });

        const updated = { ...objective, ownerId: args.newOwnerId, updatedAt: now };
        return await enrichObjective(ctx, updated);
    },
});

export const addCollaborator = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.id('user'),
        role: objectiveCollaboratorRoleValidator,
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'manageCollaborators');

        const collaboratorId = await addObjectiveCollaborator(ctx, {
            objective,
            userId: args.userId,
            role: args.role,
            addedBy: ctx.userId,
        });

        return await ctx.db.get('objectiveCollaborators', collaboratorId);
    },
});

export const updateCollaboratorRole = mutationWithRLS({
    args: {
        collaboratorId: v.id('objectiveCollaborators'),
        role: objectiveCollaboratorRoleValidator,
    },
    handler: async (ctx, args) => {
        const collaborator = await ctx.db.get('objectiveCollaborators', args.collaboratorId);
        if (!collaborator) {
            throw new ConvexError(ERROR_CODES.COLLABORATOR_NOT_FOUND);
        }

        const objective = await ctx.db.get('objectives', collaborator.objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'manageCollaborators');

        return await updateObjectiveCollaboratorRole(ctx, {
            collaboratorId: args.collaboratorId,
            role: args.role,
        });
    },
});

export const removeCollaborator = mutationWithRLS({
    args: {
        collaboratorId: v.id('objectiveCollaborators'),
    },
    handler: async (ctx, args) => {
        const collaborator = await ctx.db.get('objectiveCollaborators', args.collaboratorId);
        if (!collaborator) {
            throw new ConvexError(ERROR_CODES.COLLABORATOR_NOT_FOUND);
        }

        const objective = await ctx.db.get('objectives', collaborator.objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }

        await assertObjectiveAction(ctx, objective, 'manageCollaborators');

        return await removeObjectiveCollaborator(ctx, args.collaboratorId);
    },
});

export const purgeObjective = mutationWithRLS({
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

        await assertObjectiveAction(ctx, objective, 'purge');

        if (objective.workflowId) {
            await workflow.cancel(ctx, objective.workflowId);
        }

        const collaborators = await listCollaboratorsForObjective(ctx, args.id);
        for (const collaborator of collaborators) {
            await ctx.db.delete('objectiveCollaborators', collaborator._id);
        }

        return await deleteObjectiveWithDependents(ctx, { objectiveId: args.id });
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
