import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx, type QueryCtx } from './_generated/server';
import { mutationWithRLS, queryWithRLS } from './rls/wrappers';
import { ERROR_CODES } from './constants';
import {
    assertCanEditProgress,
    assertCanManageObjective,
    canManageObjective,
    completedAtWhenFinished,
    currentValueAfterProgressChange,
    measurementAfterBoundsChange,
    objectiveTextFields,
    progressComment,
    progressHistoryPoints,
    requireOrganizationId,
    resolvedObjectiveFields,
    roundStoredValue,
    toObjectiveSummary,
    toProgressEntry,
} from './objectiveRecords';
import { withPaginationLimits } from './utils';

const OBJECTIVE_DELETION_BATCH_SIZE = 50;
const PROGRESS_HISTORY_LIMIT = 200;
// Progress dates are the UTC midnight of the user's local day, which can be up to UTC+14.
const MAX_UTC_OFFSET_MS = 14 * 60 * 60 * 1000;

function validateProgressDate(updateDate: number, now: number) {
    if (updateDate > now + MAX_UTC_OFFSET_MS) {
        throw new ConvexError(ERROR_CODES.FUTURE_DATE_NOT_ALLOWED);
    }
}

function validateNonNegativeValue(value: number) {
    if (!Number.isFinite(value)) {
        throw new ConvexError(ERROR_CODES.VALUE_NOT_FINITE);
    }
    if (value < 0) {
        throw new ConvexError(ERROR_CODES.VALUE_NEGATIVE);
    }
}

// A progress entry of zero adds nothing to the objective.
function validateProgressValue(value: number) {
    validateNonNegativeValue(value);
    if (value === 0) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_POSITIVE);
    }
}

function validateObjectiveValues(startValue: number, targetValue: number) {
    validateNonNegativeValue(startValue);
    if (!Number.isFinite(targetValue)) {
        throw new ConvexError(ERROR_CODES.TARGET_NOT_FINITE);
    }
    if (targetValue < 0.001) {
        throw new ConvexError(ERROR_CODES.TARGET_TOO_SMALL);
    }
    // An objective that starts at its target is born completed with nothing left to log.
    if (startValue >= targetValue) {
        throw new ConvexError(ERROR_CODES.START_AFTER_TARGET);
    }
}

async function requireObjectiveInOrganization(
    ctx: QueryCtx | MutationCtx,
    objectiveId: Id<'objectives'>,
    organizationId: Id<'organization'>
): Promise<Doc<'objectives'>> {
    const objective = await ctx.db.get('objectives', objectiveId);
    if (!objective || objective.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }
    return objective;
}

function statusFromCurrentValue(currentValue: number, targetValue: number): 'active' | 'completed' {
    if (currentValue >= targetValue) {
        return 'completed';
    }
    return 'active';
}

const objectiveStatusValidator = v.union(v.literal('active'), v.literal('completed'));

const objectiveSummaryValidator = v.object({
    id: v.id('objectives'),
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    categoryName: v.optional(v.string()),
    unit: v.optional(v.string()),
    deadline: v.optional(v.number()),
    startValue: v.number(),
    currentValue: v.number(),
    targetValue: v.number(),
    status: objectiveStatusValidator,
    completedAt: v.optional(v.number()),
    progressPercent: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    canManage: v.boolean(),
});

const progressEntryValidator = v.object({
    id: v.id('progressUpdates'),
    objectiveId: v.id('objectives'),
    updatedValue: v.number(),
    updateDate: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    canEdit: v.boolean(),
});

const progressHistoryValidator = v.object({
    points: v.array(
        v.object({
            id: v.id('progressUpdates'),
            updateDate: v.number(),
            value: v.number(),
            delta: v.number(),
            comment: v.optional(v.string()),
        })
    ),
    truncated: v.boolean(),
});

const objectiveListValidator = paginationResultValidator(objectiveSummaryValidator);

const progressListValidator = paginationResultValidator(progressEntryValidator);

export const listObjectives = queryWithRLS({
    args: {
        status: v.optional(v.union(v.literal('all'), v.literal('active'), v.literal('completed'))),
        paginationOpts: paginationOptsValidator,
    },
    returns: objectiveListValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const status = args.status ?? 'all';
        let indexed;
        if (status === 'all') {
            indexed = ctx.db
                .query('objectives')
                .withIndex('by_organization_createdAt', q =>
                    q.eq('organizationId', organizationId)
                );
        } else {
            indexed = ctx.db
                .query('objectives')
                .withIndex('by_organization_status_createdAt', q =>
                    q.eq('organizationId', organizationId).eq('status', status)
                );
        }
        const result = await indexed
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));
        const categoryNames = new Map<Id<'categories'>, string>();
        for (const objective of result.page) {
            if (objective.categoryId && !categoryNames.has(objective.categoryId)) {
                const category = await ctx.db.get('categories', objective.categoryId);
                if (category) {
                    categoryNames.set(objective.categoryId, category.name);
                }
            }
        }
        return {
            ...result,
            page: result.page.map(objective => {
                const categoryName = objective.categoryId
                    ? categoryNames.get(objective.categoryId)
                    : undefined;
                return toObjectiveSummary(objective, categoryName, ctx);
            }),
        };
    },
});

export const getObjective = queryWithRLS({
    args: { id: v.id('objectives') },
    returns: v.union(objectiveSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objective = await ctx.db.get('objectives', args.id);
        if (!objective || objective.organizationId !== organizationId) {
            return null;
        }
        const category = objective.categoryId
            ? await ctx.db.get('categories', objective.categoryId)
            : null;
        return toObjectiveSummary(objective, category?.name, ctx);
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        unit: v.optional(v.string()),
        deadline: v.optional(v.number()),
        startValue: v.number(),
        targetValue: v.number(),
    },
    returns: v.id('objectives'),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        if (!(await ctx.db.get('organization', organizationId))) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }
        const now = Date.now();
        const { title, description, unit } = objectiveTextFields(args);
        if (
            args.categoryId &&
            (await ctx.db.get('categories', args.categoryId))?.organizationId !== organizationId
        ) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        validateObjectiveValues(args.startValue, args.targetValue);
        const status = statusFromCurrentValue(args.startValue, args.targetValue);
        return await ctx.db.insert('objectives', {
            organizationId,
            createdBy: ctx.userId,
            title,
            ...(description !== undefined ? { description } : {}),
            ...(args.categoryId !== undefined ? { categoryId: args.categoryId } : {}),
            ...(unit !== undefined ? { unit } : {}),
            ...(args.deadline !== undefined ? { deadline: args.deadline } : {}),
            startValue: args.startValue,
            currentValue: args.startValue,
            targetValue: args.targetValue,
            status,
            ...(status === 'completed' ? { completedAt: now } : {}),
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.union(v.string(), v.null())),
        categoryId: v.optional(v.union(v.id('categories'), v.null())),
        unit: v.optional(v.union(v.string(), v.null())),
        deadline: v.optional(v.union(v.number(), v.null())),
        startValue: v.optional(v.number()),
        targetValue: v.optional(v.number()),
    },
    returns: objectiveSummaryValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const existing = await requireObjectiveInOrganization(ctx, args.id, organizationId);
        assertCanManageObjective(ctx, existing);
        const now = Date.now();
        const { title, description, unit, categoryId, deadline, startValue, targetValue } =
            resolvedObjectiveFields(existing, args);
        validateObjectiveValues(startValue, targetValue);
        if (
            categoryId &&
            (await ctx.db.get('categories', categoryId))?.organizationId !== organizationId
        ) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        await ctx.db.replace('objectives', args.id, {
            organizationId: existing.organizationId,
            createdBy: existing.createdBy,
            title,
            ...(description !== undefined ? { description } : {}),
            ...(categoryId !== undefined ? { categoryId } : {}),
            ...(unit !== undefined ? { unit } : {}),
            ...(deadline !== undefined ? { deadline } : {}),
            startValue,
            currentValue: existing.currentValue,
            targetValue,
            status: existing.status,
            ...(existing.completedAt !== undefined ? { completedAt: existing.completedAt } : {}),
            createdAt: existing.createdAt,
            updatedAt: now,
        });
        const measurement = measurementAfterBoundsChange(existing, startValue, targetValue, now);
        if (measurement) {
            await ctx.db.patch('objectives', args.id, {
                currentValue: measurement.currentValue,
                status: measurement.status,
                updatedAt: now,
                completedAt: measurement.completedAt,
            });
        }
        const updated = await ctx.db.get('objectives', args.id);
        if (!updated) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        const category = updated.categoryId
            ? await ctx.db.get('categories', updated.categoryId)
            : null;
        return toObjectiveSummary(updated, category?.name, ctx);
    },
});

export const deleteObjective = mutationWithRLS({
    args: { id: v.id('objectives') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objective = await requireObjectiveInOrganization(ctx, args.id, organizationId);
        assertCanManageObjective(ctx, objective);
        const rows = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', args.id))
            .take(OBJECTIVE_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('progressUpdates', row._id);
        }
        if (rows.length === OBJECTIVE_DELETION_BATCH_SIZE) {
            await ctx.scheduler.runAfter(0, internal.objectives.continueDeleteObjective, {
                objectiveId: args.id,
            });
        } else {
            await ctx.db.delete('objectives', args.id);
        }
        return null;
    },
});

export const continueDeleteObjective = internalMutation({
    args: { objectiveId: v.id('objectives') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
            .take(OBJECTIVE_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('progressUpdates', row._id);
        }
        if (rows.length === OBJECTIVE_DELETION_BATCH_SIZE) {
            await ctx.scheduler.runAfter(0, internal.objectives.continueDeleteObjective, {
                objectiveId: args.objectiveId,
            });
        } else {
            const objective = await ctx.db.get('objectives', args.objectiveId);
            if (objective) {
                await ctx.db.delete('objectives', args.objectiveId);
            }
        }
        return null;
    },
});

export const listProgress = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        paginationOpts: paginationOptsValidator,
    },
    returns: progressListValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objective = await requireObjectiveInOrganization(
            ctx,
            args.objectiveId,
            organizationId
        );
        const result = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', objective._id))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));
        return {
            ...result,
            page: result.page.map(entry =>
                toProgressEntry(
                    entry,
                    entry.createdBy === ctx.userId || canManageObjective(ctx, objective)
                )
            ),
        };
    },
});

export const getProgressHistory = queryWithRLS({
    args: { objectiveId: v.id('objectives') },
    returns: progressHistoryValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objective = await requireObjectiveInOrganization(
            ctx,
            args.objectiveId,
            organizationId
        );
        const latest = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', objective._id))
            .order('desc')
            .take(PROGRESS_HISTORY_LIMIT + 1);
        const truncated = latest.length > PROGRESS_HISTORY_LIMIT;
        return {
            points: progressHistoryPoints(objective, latest.slice(0, PROGRESS_HISTORY_LIMIT)),
            truncated,
        };
    },
});

export const createProgress = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    returns: progressEntryValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objective = await requireObjectiveInOrganization(
            ctx,
            args.objectiveId,
            organizationId
        );
        const now = Date.now();

        if (objective.status === 'completed') {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
        }

        validateProgressValue(args.updatedValue);
        validateProgressDate(args.updateDate, now);
        const currentValue = currentValueAfterProgressChange(objective, null, args.updatedValue);
        const comment = progressComment(args.comment);
        const progressId = await ctx.db.insert('progressUpdates', {
            objective: objective._id,
            organizationId,
            createdBy: ctx.userId,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            ...(comment !== undefined ? { comment } : {}),
            createdAt: now,
            updatedAt: now,
        });
        const status = statusFromCurrentValue(currentValue, objective.targetValue);
        await ctx.db.patch('objectives', objective._id, {
            currentValue,
            status,
            updatedAt: now,
            completedAt: completedAtWhenFinished(status, now, objective),
        });
        const created = await ctx.db.get('progressUpdates', progressId);
        if (!created) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }
        return toProgressEntry(created, true);
    },
});

export const updateProgress = mutationWithRLS({
    args: {
        id: v.id('progressUpdates'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.union(v.string(), v.null())),
    },
    returns: progressEntryValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const existing = await ctx.db.get('progressUpdates', args.id);
        if (!existing || existing.organizationId !== organizationId) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }
        const objective = await requireObjectiveInOrganization(
            ctx,
            existing.objective,
            organizationId
        );
        assertCanEditProgress(ctx, existing, objective);
        validateProgressValue(args.updatedValue);
        const now = Date.now();
        validateProgressDate(args.updateDate, now);
        const currentValue = currentValueAfterProgressChange(
            objective,
            existing.updatedValue,
            args.updatedValue
        );
        let comment: string | undefined;
        if (args.comment === undefined) {
            comment = existing.comment;
        } else {
            comment = progressComment(args.comment);
        }
        await ctx.db.replace('progressUpdates', args.id, {
            objective: existing.objective,
            organizationId: existing.organizationId,
            createdBy: existing.createdBy,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            ...(comment !== undefined ? { comment } : {}),
            createdAt: existing.createdAt,
            updatedAt: now,
        });
        const status = statusFromCurrentValue(currentValue, objective.targetValue);
        await ctx.db.patch('objectives', objective._id, {
            currentValue,
            status,
            updatedAt: now,
            completedAt: completedAtWhenFinished(status, now, objective),
        });
        const updated = await ctx.db.get('progressUpdates', args.id);
        if (!updated) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }
        return toProgressEntry(updated, true);
    },
});

export const deleteProgress = mutationWithRLS({
    args: { id: v.id('progressUpdates') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const existing = await ctx.db.get('progressUpdates', args.id);
        if (!existing || existing.organizationId !== organizationId) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }
        const objective = await requireObjectiveInOrganization(
            ctx,
            existing.objective,
            organizationId
        );
        assertCanEditProgress(ctx, existing, objective);
        await ctx.db.delete('progressUpdates', args.id);
        const now = Date.now();
        const currentValue = roundStoredValue(
            Math.max(objective.startValue, objective.currentValue - existing.updatedValue)
        );
        const status = statusFromCurrentValue(currentValue, objective.targetValue);
        await ctx.db.patch('objectives', objective._id, {
            currentValue,
            status,
            updatedAt: now,
            completedAt: completedAtWhenFinished(status, now, objective),
        });
        return null;
    },
});
