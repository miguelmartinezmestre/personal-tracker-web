import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { ERROR_CODES } from './shared/errorCodes';
import {
    measurement,
    objectiveTextFields,
    requireObjective,
    requireOrganizationId,
    resolvedObjectiveFields,
    roundStoredValue,
    toObjectiveSummaries,
    toObjectiveSummary,
    validateCategory,
} from './features/objectives/records';
import { memberAccessFields, objectiveAccess } from './features/objectives/access';
import { replaceUserGrants } from './features/objectives/grants';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import {
    accessLevelValidator,
    deadlineFilterValidator,
    objectiveDirectionValidator,
    objectiveListValidator,
    objectiveSummaryValidator,
    userGrantValidator,
} from './features/objectives/validators';
import {
    deadlineRange,
    dueSoonDaysFor,
    validateDeadline,
    validateObjectiveValues,
} from './features/objectives/rules';
import { paginateObjectives, searchObjectives } from './features/objectives/listing';

export const listObjectives = queryWithRLS({
    args: {
        status: v.optional(v.union(v.literal('all'), v.literal('active'), v.literal('completed'))),
        // The category comes from the URL, so a malformed one just matches nothing.
        categoryId: v.optional(v.string()),
        deadline: v.optional(v.object({ filter: deadlineFilterValidator, today: v.number() })),
        search: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    returns: objectiveListValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const categoryId = args.categoryId && ctx.db.normalizeId('categories', args.categoryId);
        let status = args.status ?? 'all';

        // Only active objectives can be overdue.
        if (args.deadline?.filter === 'overdue') {
            if (status === 'completed') {
                return { page: [], isDone: true, continueCursor: '' };
            }

            status = 'active';
        }

        if (categoryId === null) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const filters = {
            status,
            categoryId: categoryId || undefined,
            deadlineRange:
                args.deadline && deadlineRange(args.deadline.filter, args.deadline.today),
        };

        const search = args.search?.trim();

        // Matches come by relevance, so the next-page check of the indexes doesn't apply.
        const result = search
            ? await searchObjectives(ctx.db, organizationId, search, filters, args.paginationOpts)
            : await paginateObjectives(ctx.db, organizationId, filters, args.paginationOpts);

        return { ...result, page: await toObjectiveSummaries(ctx.db, ctx, result.page) };
    },
});

export const getObjective = queryWithRLS({
    // The id comes from the URL, so a malformed one is reported as not found.
    args: { id: v.string() },
    returns: v.union(objectiveSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const objectiveId = ctx.db.normalizeId('objectives', args.id);

        if (!objectiveId) {
            return null;
        }

        // Objectives the user may not see are filtered out by row-level security.
        const objective = await ctx.db.get('objectives', objectiveId);

        if (
            !objective ||
            objective.organizationId !== organizationId ||
            objective.deletedAt !== undefined
        ) {
            return null;
        }

        const category = objective.categoryId
            ? await ctx.db.get('categories', objective.categoryId)
            : null;

        return toObjectiveSummary(
            objective,
            category?.name,
            await objectiveAccess(ctx.db, ctx, objective)
        );
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        unit: v.optional(v.string()),
        deadline: v.optional(v.number()),
        dueSoonDays: v.optional(v.number()),
        direction: v.optional(objectiveDirectionValidator),
        startValue: v.number(),
        targetValue: v.number(),
        // By default every member can see the objective but not edit it (decision 3).
        memberAccess: v.optional(accessLevelValidator),
        users: v.optional(v.array(userGrantValidator)),
    },
    returns: v.id('objectives'),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);

        if (!(await ctx.db.get('organization', organizationId))) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        const now = Date.now();
        const direction = args.direction ?? 'increase';
        const { title, description, unit } = objectiveTextFields(args);
        await validateCategory(ctx.db, args.categoryId, organizationId);
        validateObjectiveValues(direction, args.startValue, args.targetValue);

        if (args.deadline !== undefined) {
            validateDeadline(args.deadline, now);
        }

        const objectiveId = await ctx.db.insert('objectives', {
            organizationId,
            createdBy: ctx.userId,
            title,
            description,
            categoryId: args.categoryId,
            unit,
            deadline: args.deadline,
            dueSoonDays: dueSoonDaysFor(args.deadline, args.dueSoonDays),
            direction,
            ...memberAccessFields(args.memberAccess ?? 'view'),
            startValue: args.startValue,
            currentValue: args.startValue,
            targetValue: args.targetValue,
            status: 'active',
            createdAt: now,
            updatedAt: now,
        });

        if (args.users?.length) {
            const { objective } = await requireObjective(ctx.db, ctx, objectiveId);
            await replaceUserGrants(ctx.db, objective, args.users, ctx.userId, now);
        }

        return objectiveId;
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
        dueSoonDays: v.optional(v.number()),
        direction: v.optional(objectiveDirectionValidator),
        startValue: v.optional(v.number()),
        targetValue: v.optional(v.number()),
    },
    returns: objectiveSummaryValidator,
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { objective: existing, access } = await requireObjective(ctx.db, ctx, args.id);

        if (!access.canEdit) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        if (existing.status === 'completed') {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
        }

        const now = Date.now();
        const fields = resolvedObjectiveFields(existing, args);
        validateObjectiveValues(fields.direction, fields.startValue, fields.targetValue);

        // An objective whose deadline already passed can still be edited without moving it.
        if (fields.deadline !== undefined && fields.deadline !== existing.deadline) {
            validateDeadline(fields.deadline, now);
        }

        await validateCategory(ctx.db, fields.categoryId, existing.organizationId);

        // A new start moves the recorded progress with it; the new bounds may already be reached.
        const current = measurement(
            fields,
            roundStoredValue(existing.currentValue - existing.startValue + fields.startValue),
            now
        );

        await ctx.db.replace('objectives', args.id, {
            organizationId: existing.organizationId,
            createdBy: existing.createdBy,
            memberCanView: existing.memberCanView,
            memberCanEdit: existing.memberCanEdit,
            ...fields,
            dueSoonDays: dueSoonDaysFor(fields.deadline, fields.dueSoonDays),
            ...current,
            createdAt: existing.createdAt,
            updatedAt: now,
        });

        const updated = await requireObjective(ctx.db, ctx, args.id);

        const category = updated.objective.categoryId
            ? await ctx.db.get('categories', updated.objective.categoryId)
            : null;

        return toObjectiveSummary(updated.objective, category?.name, updated.access);
    },
});

// Deleting moves the objective to the trash, where it keeps its data (INH-PAP-01).
export const deleteObjective = mutationWithRLS({
    args: { id: v.id('objectives') },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { access } = await requireObjective(ctx.db, ctx, args.id);

        if (!access.canManage) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        await ctx.db.patch('objectives', args.id, {
            deletedAt: Date.now(),
            deletedBy: ctx.userId,
        });

        return null;
    },
});
