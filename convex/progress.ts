import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { PROGRESS_SERIES_LIMIT } from './features/objectives/constants';
import {
    progressComment,
    progressHistoryPoints,
    requireObjective,
    requireOrganizationId,
    roundStoredValue,
    toProgressEntry,
} from './features/objectives/records';
import {
    applyDifference,
    positionOf,
    recalculateResultingValues,
    requireEditableEntry,
} from './features/objectives/progress';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import {
    progressEntryValidator,
    progressHistoryValidator,
    progressListValidator,
} from './features/objectives/validators';
import { validateProgressDate, validateProgressDifference } from './features/objectives/rules';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';

export const listProgress = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        paginationOpts: paginationOptsValidator,
    },
    returns: progressListValidator,
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { objective, access } = await requireObjective(ctx.db, ctx, args.objectiveId);

        const result = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', objective._id))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        // Entries of a completed objective are closed to everyone.
        const canEdit = access.canEdit && objective.status === 'active';

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'progressUpdates',
                index: 'by_objective_date',
                prefix: [objective._id],
                indexKey: doc => [doc.objective, doc.updateDate],
                paginationOpts: args.paginationOpts,
            },
            result,
            result.page.map(entry => toProgressEntry(entry, canEdit))
        );
    },
});

export const getProgressHistory = queryWithRLS({
    args: { objectiveId: v.id('objectives') },
    returns: progressHistoryValidator,
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { objective } = await requireObjective(ctx.db, ctx, args.objectiveId);

        const newestFirst = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', objective._id))
            .order('desc')
            .take(PROGRESS_SERIES_LIMIT + 1);

        return {
            points: progressHistoryPoints(newestFirst.slice(0, PROGRESS_SERIES_LIMIT)),
            isTruncated: newestFirst.length > PROGRESS_SERIES_LIMIT,
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
        const { objective, access } = await requireObjective(ctx.db, ctx, args.objectiveId);

        // Logging progress is editing the objective, and a completed one is closed (decision 11).
        if (!access.canEdit) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
        }

        if (objective.status === 'completed') {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
        }

        const now = Date.now();
        validateProgressDifference(args.updatedValue);
        validateProgressDate(args.updateDate, now);

        const progressId = await ctx.db.insert('progressUpdates', {
            objective: objective._id,
            organizationId,
            createdBy: ctx.userId,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            // Right for the latest day; a backdated entry is corrected with those after it.
            resultingValue: roundStoredValue(objective.currentValue + args.updatedValue),
            comment: progressComment(args.comment),
            createdAt: now,
            updatedAt: now,
        });

        await applyDifference(ctx, objective, args.updatedValue, now);
        const inserted = await ctx.db.get('progressUpdates', progressId);

        if (!inserted) {
            throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
        }

        await recalculateResultingValues(ctx, objective._id, positionOf(inserted));
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
        const { entry, objective } = await requireEditableEntry(ctx, args.id);
        const now = Date.now();
        validateProgressDifference(args.updatedValue);
        validateProgressDate(args.updateDate, now);

        await ctx.db.replace('progressUpdates', args.id, {
            objective: entry.objective,
            organizationId: entry.organizationId,
            createdBy: entry.createdBy,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            resultingValue: entry.resultingValue,
            comment: args.comment === undefined ? entry.comment : progressComment(args.comment),
            createdAt: entry.createdAt,
            updatedAt: now,
        });

        await applyDifference(ctx, objective, args.updatedValue - entry.updatedValue, now);
        // Everything from the earlier of its old and new days changes.
        await recalculateResultingValues(ctx, objective._id, {
            ...positionOf(entry),
            updateDate: Math.min(entry.updateDate, args.updateDate),
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
        const { entry, objective } = await requireEditableEntry(ctx, args.id);
        await ctx.db.delete('progressUpdates', args.id);
        await applyDifference(ctx, objective, -entry.updatedValue, Date.now());
        await recalculateResultingValues(ctx, objective._id, positionOf(entry));

        return null;
    },
});

export const continueResultingValues = internalMutation({
    args: { objectiveId: v.id('objectives'), updateDate: v.number(), creationTime: v.number() },
    returns: v.null(),
    handler: async (ctx, { objectiveId, ...from }) => {
        await recalculateResultingValues(ctx, objectiveId, from);

        return null;
    },
});
