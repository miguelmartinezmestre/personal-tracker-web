import { paginateVisible } from './utils/visiblePagination';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutation } from './platform/db/internalMutation';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import {
    objectiveCollaboratorRoleValidator,
    objectiveStatusValidator,
    objectiveVisibilityValidator,
} from './utils/validators';
import { ERROR_CODES, OBJECTIVE_VISIBILITY } from './utils/constants';
import { withInvalidCursorRetry } from './utils/pagination';
import { assertValidReferenceTimestamp } from './utils/queryTime';
import { validateObjectiveMetrics } from './domain/objectives/metrics';
import { getCategoryForObjective } from './domain/objectives/access';
import { deadlineRangeValidator } from './domain/objectives/filters';
import { listObjectives, searchObjectivesPage } from './domain/objectives/list';
import {
    continueObjectiveDeletion,
    deleteObjectiveWithDependents,
} from './jobs/objectives/deleteObjective';
import { assertObjectiveAction, enrichObjectiveForActor } from './domain/objectives/access';
import {
    addObjectiveCollaborator,
    removeObjectiveCollaborator,
    updateObjectiveCollaboratorRole,
} from './domain/objectives/collaborators';
import { transitionObjective } from './domain/objectives/transitions';
import {
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
} from '../shared/input-constraints';
import { toUtcCivilDay } from '../shared/civil-date';
import {
    assertOptionalBoundedString,
    normalizeRequiredBoundedString,
} from './utils/inputValidation';
import {
    collaboratorEnrichedValidator,
    objectiveCollaboratorDocumentValidator,
    objectiveWithCapabilitiesValidator,
    paginatedObjectivesValidator,
    successResultValidator,
} from './utils/apiReturnValidators';
export const getObjectives = queryWithRLS({
    args: {
        now: v.optional(v.number()),
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        categoryId: v.optional(v.id('categories')),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    returns: paginatedObjectivesValidator,
    handler: async (ctx, { paginationOpts, status, categoryId, deadlineRange, now }) => {
        if (now !== undefined) {
            assertValidReferenceTimestamp(now);
        }
        const page = await withInvalidCursorRetry(paginationOpts, retryPaginationOpts =>
            listObjectives(ctx, {
                paginationOpts: retryPaginationOpts,
                status,
                categoryId,
                deadlineRange,
            })
        );
        const enrichedPage = await Promise.all(
            page.page.map(objective => enrichObjectiveForActor(ctx, objective))
        );
        return {
            ...page,
            page: enrichedPage,
        };
    },
});
export const getDeletedObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedObjectivesValidator,
    handler: async (ctx, { paginationOpts }) => {
        const page = await withInvalidCursorRetry(paginationOpts, retryPaginationOpts =>
            listObjectives(ctx, {
                paginationOpts: retryPaginationOpts,
                deletionState: 'deleted',
            })
        );
        return {
            ...page,
            page: await Promise.all(
                page.page.map(objective => enrichObjectiveForActor(ctx, objective))
            ),
        };
    },
});
export const searchObjectivesPaginated = queryWithRLS({
    args: {
        now: v.optional(v.number()),
        search: v.string(),
        paginationOpts: paginationOptsValidator,
        status: v.optional(objectiveStatusValidator),
        categoryId: v.optional(v.id('categories')),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    returns: paginatedObjectivesValidator,
    handler: async (ctx, args) => {
        if (args.now !== undefined) {
            assertValidReferenceTimestamp(args.now);
        }
        const result = await searchObjectivesPage(ctx, args);
        return {
            ...result,
            page: await Promise.all(
                result.page.map(objective => enrichObjectiveForActor(ctx, objective))
            ),
        };
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
        return await enrichObjectiveForActor(ctx, objective);
    },
});
export const getObjectiveCollaboratorsPage = queryWithRLS({
    args: { objectiveId: v.id('objectives'), paginationOpts: paginationOptsValidator },
    returns: v.object({
        ...paginationResultValidator(collaboratorEnrichedValidator).fields,
        needsContinuation: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        await assertObjectiveAction(ctx, objective, 'view');
        const result = await paginateVisible({
            scope: JSON.stringify([
                'collaborators',
                ctx.userId,
                objective.organizationId,
                args.objectiveId,
            ]),
            paginationOpts: args.paginationOpts,
            fetchPage: paginationOpts =>
                ctx.dbForIntegrityChecks
                    .query('objectiveCollaborators')
                    .withIndex('by_objective', q => q.eq('objectiveId', args.objectiveId))
                    .paginate(paginationOpts),
            get: async id => {
                const normalized = ctx.db.normalizeId('objectiveCollaborators', id);
                return normalized
                    ? await ctx.dbForIntegrityChecks.get('objectiveCollaborators', normalized)
                    : null;
            },
            accepts: collaborator =>
                collaborator.objectiveId === objective._id &&
                collaborator.organizationId === objective.organizationId,
        });
        const page = await Promise.all(
            result.page.map(async collaborator => {
                const [user, member] = await Promise.all([
                    ctx.dbForIntegrityChecks.get('user', collaborator.userId),
                    ctx.dbForIntegrityChecks
                        .query('member')
                        .withIndex('by_organizationId_and_userId', q =>
                            q
                                .eq('organizationId', objective.organizationId)
                                .eq('userId', collaborator.userId)
                        )
                        .first(),
                ]);
                return {
                    id: collaborator._id,
                    objectiveId: collaborator.objectiveId,
                    userId: collaborator.userId,
                    role: collaborator.role,
                    addedBy: collaborator.addedBy,
                    createdAt: collaborator.createdAt,
                    user:
                        user && member
                            ? { name: user.name, email: user.email, image: user.image }
                            : null,
                };
            })
        );
        return { ...result, page };
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
        const title = normalizeRequiredBoundedString(args.title, OBJECTIVE_TITLE_MAX_LENGTH);
        assertOptionalBoundedString(args.description, OBJECTIVE_DESCRIPTION_MAX_LENGTH);
        assertOptionalBoundedString(args.unit, OBJECTIVE_UNIT_MAX_LENGTH);
        if (
            args.startValue !== undefined &&
            args.currentValue !== undefined &&
            args.startValue !== args.currentValue
        ) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
        const startValue = args.startValue ?? args.currentValue ?? 0;
        const deadline = args.deadline === undefined ? undefined : toUtcCivilDay(args.deadline);
        validateObjectiveMetrics({
            targetValue: args.targetValue,
            currentValue: startValue,
            startValue,
            deadline,
        });
        let resolvedCategoryId: Id<'categories'> | undefined;
        if (args.categoryId) {
            const category = await getCategoryForObjective(ctx, organizationId, args.categoryId);
            resolvedCategoryId = category._id;
        }
        const objectiveId = await ctx.db.insert('objectives', {
            createdBy: userId,
            ownerId: userId,
            visibility: args.visibility ?? OBJECTIVE_VISIBILITY.PRIVATE,
            organizationId,
            title,
            description: args.description,
            categoryId: resolvedCategoryId,
            targetValue: args.targetValue,
            currentValue: startValue,
            startValue,
            deadline,
            status: 'active',
            earlyBirdCompleted: false,
            unit: args.unit,
            createdAt: now,
            updatedAt: now,
        });
        await transitionObjective(ctx, objectiveId, { actorUserId: userId, created: true });
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
        deadline: v.optional(v.union(v.number(), v.null())),
        unit: v.optional(v.string()),
    },
    returns: objectiveWithCapabilitiesValidator,
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        await assertObjectiveAction(ctx, objective, 'editDefinition');
        const title =
            args.title === undefined
                ? undefined
                : normalizeRequiredBoundedString(args.title, OBJECTIVE_TITLE_MAX_LENGTH);
        assertOptionalBoundedString(args.description, OBJECTIVE_DESCRIPTION_MAX_LENGTH);
        assertOptionalBoundedString(args.unit, OBJECTIVE_UNIT_MAX_LENGTH);
        const previousStartValue = objective.startValue;
        const nextStartValue = args.startValue ?? previousStartValue;
        // `currentValue - startValue` is the transactionally maintained sum of
        // progress entries. Moving the baseline therefore shifts currentValue
        // by the same amount without reading the history.
        const nextCurrentValue = objective.currentValue + (nextStartValue - previousStartValue);
        let nextDeadline: number | undefined;
        if (args.deadline === undefined) {
            nextDeadline = objective.deadline;
        } else if (args.deadline === null) {
            nextDeadline = undefined;
        } else {
            nextDeadline = toUtcCivilDay(args.deadline);
        }
        validateObjectiveMetrics({
            targetValue: args.targetValue ?? objective.targetValue,
            currentValue: nextCurrentValue,
            startValue: nextStartValue,
            deadline: nextDeadline,
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
            currentValue: number;
            startValue: number;
            deadline: number | undefined;
            unit: string;
            updatedAt: number;
        }> = {
            updatedAt: Date.now(),
        };
        if (title !== undefined) {
            patch.title = title;
        }
        if (args.description !== undefined) {
            patch.description = args.description;
        }
        if (args.categoryId !== undefined) {
            patch.categoryId = resolvedCategoryId;
        }
        if (args.targetValue !== undefined) {
            patch.targetValue = args.targetValue;
        }
        if (args.startValue !== undefined) {
            patch.startValue = args.startValue;
            patch.currentValue = nextCurrentValue;
        }
        if (args.deadline !== undefined) {
            patch.deadline = nextDeadline;
        }
        if (args.unit !== undefined) {
            patch.unit = args.unit;
        }
        await ctx.db.patch('objectives', args.id, patch);
        await transitionObjective(ctx, args.id, { actorUserId: ctx.userId });
        const updated = await ctx.db.get('objectives', args.id);
        if (!updated) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        return await enrichObjectiveForActor(ctx, updated);
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
    returns: objectiveWithCapabilitiesValidator,
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        if (objective.deletedAt === undefined) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_DELETED);
        }
        if (objective.purgeToken) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_PURGE_IN_PROGRESS);
        }
        await assertObjectiveAction(ctx, objective, 'restore');
        await ctx.db.patch('objectives', args.id, {
            deletedAt: undefined,
            deletedBy: undefined,
            updatedAt: Date.now(),
        });
        await transitionObjective(ctx, args.id, { actorUserId: ctx.userId });
        const restored = await ctx.db.get('objectives', args.id);
        if (!restored) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        return await enrichObjectiveForActor(ctx, restored);
    },
});
export const setObjectiveVisibility = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        visibility: objectiveVisibilityValidator,
    },
    returns: objectiveWithCapabilitiesValidator,
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
        return await enrichObjectiveForActor(ctx, updated);
    },
});
export const transferObjectiveOwnership = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        newOwnerId: v.id('user'),
    },
    returns: objectiveWithCapabilitiesValidator,
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
        return await enrichObjectiveForActor(ctx, updated);
    },
});
export const addCollaborator = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.id('user'),
        role: objectiveCollaboratorRoleValidator,
    },
    returns: v.union(objectiveCollaboratorDocumentValidator, v.null()),
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
    returns: v.union(objectiveCollaboratorDocumentValidator, v.null()),
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
    returns: successResultValidator,
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
    }),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        if (objective.deletedAt === undefined) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_DELETED);
        }
        if (objective.purgeToken) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_PURGE_IN_PROGRESS);
        }
        await assertObjectiveAction(ctx, objective, 'purge');
        const now = Date.now();
        const purgeToken = `${now.toString(36)}-${Math.random().toString(36).slice(2)}`;
        await ctx.db.patch('objectives', args.id, {
            purgeToken,
            updatedAt: now,
        });
        return await deleteObjectiveWithDependents(ctx, { objectiveId: args.id, purgeToken });
    },
});
export const deleteObjectiveContinue = internalMutation({
    returns: v.null(),
    args: {
        objectiveId: v.id('objectives'),
        purgeToken: v.string(),
        phase: v.optional(
            v.union(v.literal('collaborators'), v.literal('progress'), v.literal('notifications'))
        ),
    },
    handler: continueObjectiveDeletion,
});
