import { paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';

const objectiveStatusValidator = v.union(v.literal('active'), v.literal('completed'));

export const objectiveDirectionValidator = v.union(v.literal('increase'), v.literal('decrease'));

export const accessLevelValidator = v.union(
    v.literal('none'),
    v.literal('view'),
    v.literal('edit')
);

export const deadlineFilterValidator = v.union(
    v.literal('overdue'),
    v.literal('today'),
    v.literal('week'),
    v.literal('month')
);

export const objectiveSummaryValidator = v.object({
    id: v.id('objectives'),
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    categoryName: v.optional(v.string()),
    unit: v.optional(v.string()),
    deadline: v.optional(v.number()),
    dueSoonDays: v.optional(v.number()),
    direction: objectiveDirectionValidator,
    startValue: v.number(),
    currentValue: v.number(),
    targetValue: v.number(),
    status: objectiveStatusValidator,
    completedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    progressPercent: v.number(),
    createdAt: v.number(),
    // Earliest progress date; progress can be backdated before the objective was created.
    firstProgressAt: v.optional(v.number()),
    updatedAt: v.number(),
    memberAccess: accessLevelValidator,
    canEdit: v.boolean(),
    canManage: v.boolean(),
});

export const userGrantValidator = v.object({
    userId: v.id('user'),
    access: v.union(v.literal('view'), v.literal('edit')),
});

export const objectiveAccessValidator = v.object({
    memberAccess: accessLevelValidator,
    users: v.array(
        v.object({
            userId: v.id('user'),
            name: v.string(),
            email: v.string(),
            access: v.union(v.literal('view'), v.literal('edit')),
        })
    ),
});

export const progressEntryValidator = v.object({
    id: v.id('progressUpdates'),
    objectiveId: v.id('objectives'),
    updatedValue: v.number(),
    updateDate: v.number(),
    resultingValue: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    canEdit: v.boolean(),
});

export const progressHistoryValidator = v.object({
    points: v.array(
        v.object({
            id: v.id('progressUpdates'),
            updateDate: v.number(),
            value: v.number(),
            delta: v.number(),
            comment: v.optional(v.string()),
        })
    ),
    isTruncated: v.boolean(),
});

export const objectiveListValidator = paginationResultValidator(objectiveSummaryValidator);

export const progressListValidator = paginationResultValidator(progressEntryValidator);
