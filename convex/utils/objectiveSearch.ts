import { v } from 'convex/values';
import { queryWithRLS } from '../rls';
import { deadlineRangeValidator } from './objectiveFilters';
import { objectiveStatusValidator } from './validators';
import { searchObjectives } from './objectiveList';

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
