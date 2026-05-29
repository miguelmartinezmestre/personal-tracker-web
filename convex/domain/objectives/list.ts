import type { PaginationOptions } from 'convex/server';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import type { ObjectiveStatus } from '../../utils/constants';
import type { DeadlineRange } from './filters';
import { getDeadlineRangeBounds, matchesDeadlineRange } from './filters';

const SEARCH_LIMIT = 50;

const EMPTY_PAGE = { page: [], continueCursor: '', isDone: true };

export type ObjectiveListSection = 'personal' | 'organization';

export type ObjectiveListFilters = {
    status?: ObjectiveStatus;
    category?: string;
    deadlineRange?: DeadlineRange;
};

type NormalizedObjectiveListFilters = {
    status: ObjectiveStatus | undefined;
    category: string | undefined;
    deadlineRange: DeadlineRange | undefined;
};

type ObjectiveListCtx = {
    db: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
};

type ObjectiveListArgs = ObjectiveListFilters & {
    section: ObjectiveListSection;
    paginationOpts: PaginationOptions;
};

export type ObjectiveSearchArgs = ObjectiveListFilters & {
    section: ObjectiveListSection;
    search: string;
    limit?: number;
};

type SearchableObjective = Pick<
    Doc<'objectives'>,
    'title' | 'description' | 'category' | 'deadline'
>;

export function normalizeObjectiveListFilters(
    filters: ObjectiveListFilters
): NormalizedObjectiveListFilters {
    const trimmedCategory = filters.category?.trim();

    return {
        status: filters.status,
        category: trimmedCategory && trimmedCategory !== 'all' ? trimmedCategory : undefined,
        deadlineRange: filters.deadlineRange,
    };
}

function matchesObjectiveSearch(objective: SearchableObjective, search: string) {
    const needle = search.toLowerCase();
    return [objective.title, objective.description, objective.category].some(value =>
        value?.toLowerCase().includes(needle)
    );
}

function matchesObjectiveFilters(
    objective: SearchableObjective & { status: ObjectiveStatus },
    filters: NormalizedObjectiveListFilters
) {
    if (filters.status && objective.status !== filters.status) {
        return false;
    }
    if (filters.category && objective.category !== filters.category) {
        return false;
    }
    if (filters.deadlineRange && !matchesDeadlineRange(objective.deadline, filters.deadlineRange)) {
        return false;
    }

    return true;
}

async function listPersonalObjectives(
    ctx: ObjectiveListCtx,
    paginationOpts: PaginationOptions,
    filters: NormalizedObjectiveListFilters
) {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return EMPTY_PAGE;
    }

    if (filters.deadlineRange) {
        const bounds = getDeadlineRangeBounds(filters.deadlineRange);

        if (filters.status && filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_status_category_deadline', q => {
                    const indexed = q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('status', filters.status!)
                        .eq('category', filters.category!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        if (filters.status) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_status_deadline', q => {
                    const indexed = q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('status', filters.status!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        if (filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_category_deadline', q => {
                    const indexed = q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('category', filters.category!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        return await ctx.db
            .query('objectives')
            .withIndex('by_user_organization_scope_deadline', q => {
                const indexed = q
                    .eq('userId', ctx.userId)
                    .eq('organizationId', organizationId)
                    .eq('scope', 'personal');
                return bounds.gte !== undefined
                    ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                    : indexed.lt('deadline', bounds.lt);
            })
            .order('desc')
            .paginate(paginationOpts);
    }

    if (filters.status) {
        if (filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_status_category', q =>
                    q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('status', filters.status!)
                        .eq('category', filters.category!)
                )
                .order('desc')
                .paginate(paginationOpts);
        }

        return await ctx.db
            .query('objectives')
            .withIndex('by_user_organization_scope_status', q =>
                q
                    .eq('userId', ctx.userId)
                    .eq('organizationId', organizationId)
                    .eq('scope', 'personal')
                    .eq('status', filters.status!)
            )
            .order('desc')
            .paginate(paginationOpts);
    }

    if (filters.category) {
        return await ctx.db
            .query('objectives')
            .withIndex('by_user_organization_scope_category', q =>
                q
                    .eq('userId', ctx.userId)
                    .eq('organizationId', organizationId)
                    .eq('scope', 'personal')
                    .eq('category', filters.category!)
            )
            .order('desc')
            .paginate(paginationOpts);
    }

    return await ctx.db
        .query('objectives')
        .withIndex('by_user_organization_scope', q =>
            q.eq('userId', ctx.userId).eq('organizationId', organizationId).eq('scope', 'personal')
        )
        .order('desc')
        .paginate(paginationOpts);
}

async function listOrganizationObjectives(
    ctx: ObjectiveListCtx,
    paginationOpts: PaginationOptions,
    filters: NormalizedObjectiveListFilters
) {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return EMPTY_PAGE;
    }

    if (filters.deadlineRange) {
        const bounds = getDeadlineRangeBounds(filters.deadlineRange);

        if (filters.status && filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status_category_deadline', q => {
                    const indexed = q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', filters.status!)
                        .eq('category', filters.category!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        if (filters.status) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status_deadline', q => {
                    const indexed = q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', filters.status!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        if (filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_category_deadline', q => {
                    const indexed = q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('category', filters.category!);
                    return bounds.gte !== undefined
                        ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                        : indexed.lt('deadline', bounds.lt);
                })
                .order('desc')
                .paginate(paginationOpts);
        }

        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope_deadline', q => {
                const indexed = q.eq('organizationId', organizationId).eq('scope', 'organization');
                return bounds.gte !== undefined
                    ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                    : indexed.lt('deadline', bounds.lt);
            })
            .order('desc')
            .paginate(paginationOpts);
    }

    if (filters.status) {
        if (filters.category) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status_category', q =>
                    q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', filters.status!)
                        .eq('category', filters.category!)
                )
                .order('desc')
                .paginate(paginationOpts);
        }

        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope_status', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('scope', 'organization')
                    .eq('status', filters.status!)
            )
            .order('desc')
            .paginate(paginationOpts);
    }

    if (filters.category) {
        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope_category', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('scope', 'organization')
                    .eq('category', filters.category!)
            )
            .order('desc')
            .paginate(paginationOpts);
    }

    return await ctx.db
        .query('objectives')
        .withIndex('by_organization_scope', q =>
            q.eq('organizationId', organizationId).eq('scope', 'organization')
        )
        .order('desc')
        .paginate(paginationOpts);
}

export async function listObjectives(ctx: ObjectiveListCtx, args: ObjectiveListArgs) {
    const filters = normalizeObjectiveListFilters(args);

    if (args.section === 'personal') {
        return await listPersonalObjectives(ctx, args.paginationOpts, filters);
    }

    return await listOrganizationObjectives(ctx, args.paginationOpts, filters);
}

export async function searchObjectives(ctx: ObjectiveListCtx, args: ObjectiveSearchArgs) {
    const search = args.search.trim();
    const organizationId = ctx.organizationId;
    if (!organizationId || !search) {
        return [];
    }

    const filters = normalizeObjectiveListFilters(args);
    const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), SEARCH_LIMIT);
    const scope = args.section;
    const query =
        scope === 'personal'
            ? ctx.db
                  .query('objectives')
                  .withSearchIndex('search_text_by_user_organization_scope_status_category', q =>
                      q
                          .search('searchText', search)
                          .eq('userId', ctx.userId)
                          .eq('organizationId', organizationId)
                          .eq('scope', 'personal')
                  )
            : ctx.db
                  .query('objectives')
                  .withSearchIndex('search_text_by_organization_scope_status_category', q =>
                      q
                          .search('searchText', search)
                          .eq('organizationId', organizationId)
                          .eq('scope', 'organization')
                  );

    return (await query.take(limit * 5))
        .filter(objective => matchesObjectiveFilters(objective, filters))
        .filter(objective => matchesObjectiveSearch(objective, search))
        .slice(0, limit);
}
