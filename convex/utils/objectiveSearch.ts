import { v } from 'convex/values';
import { queryWithRLS } from '../rls';
import { deadlineRangeValidator, matchesDeadlineRange } from './objectiveFilters';
import { objectiveStatusValidator } from './validators';

const SEARCH_LIMIT = 50;
const SEARCH_SCAN_LIMIT = 500;

type SearchableObjective = {
    title: string;
    description?: string;
    category?: string;
    deadline?: number;
};

function matchesObjectiveSearch(objective: SearchableObjective, search: string) {
    const needle = search.toLowerCase();
    return [objective.title, objective.description, objective.category].some(value =>
        value?.toLowerCase().includes(needle)
    );
}

export const searchObjectivesByUser = queryWithRLS({
    args: {
        search: v.string(),
        limit: v.optional(v.number()),
        status: v.optional(objectiveStatusValidator),
        category: v.optional(v.string()),
        deadlineRange: v.optional(deadlineRangeValidator),
    },
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const search = args.search.trim();
        if (!organizationId || !search) {
            return [];
        }

        const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), SEARCH_LIMIT);
        const categoryFilter = args.category && args.category !== 'all' ? args.category : undefined;
        const deadlineRange = args.deadlineRange;
        const candidates = await ctx.db
            .query('objectives')
            .withIndex('by_user_organization', q =>
                q.eq('userId', ctx.userId).eq('organizationId', organizationId)
            )
            .filter(q => q.eq(q.field('scope'), 'personal'))
            .order('desc')
            .take(SEARCH_SCAN_LIMIT);

        return candidates
            .filter(objective => !args.status || objective.status === args.status)
            .filter(objective => !categoryFilter || objective.category === categoryFilter)
            .filter(
                objective =>
                    !deadlineRange || matchesDeadlineRange(objective.deadline, deadlineRange)
            )
            .filter(objective => matchesObjectiveSearch(objective, search))
            .slice(0, limit);
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
        const organizationId = ctx.organizationId;
        const search = args.search.trim();
        if (!organizationId || !search) {
            return [];
        }

        const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), SEARCH_LIMIT);
        const categoryFilter = args.category && args.category !== 'all' ? args.category : undefined;
        const deadlineRange = args.deadlineRange;
        const candidates = await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope', q =>
                q.eq('organizationId', organizationId).eq('scope', 'organization')
            )
            .order('desc')
            .take(SEARCH_SCAN_LIMIT);

        return candidates
            .filter(objective => !args.status || objective.status === args.status)
            .filter(objective => !categoryFilter || objective.category === categoryFilter)
            .filter(
                objective =>
                    !deadlineRange || matchesDeadlineRange(objective.deadline, deadlineRange)
            )
            .filter(objective => matchesObjectiveSearch(objective, search))
            .slice(0, limit);
    },
});
