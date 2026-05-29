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
    categoryId?: Id<'categories'>;
    deadlineRange?: DeadlineRange;
};

type NormalizedObjectiveListFilters = {
    status: ObjectiveStatus | undefined;
    categoryId: Id<'categories'> | undefined;
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

type SearchableObjective = Pick<Doc<'objectives'>, 'title' | 'categoryId' | 'deadline'>;

export function normalizeObjectiveListFilters(
    filters: ObjectiveListFilters
): NormalizedObjectiveListFilters {
    return {
        status: filters.status,
        categoryId: filters.categoryId,
        deadlineRange: filters.deadlineRange,
    };
}

function matchesObjectiveSearch(objective: SearchableObjective, search: string) {
    return objective.title.toLowerCase().includes(search.toLowerCase());
}

function matchesObjectiveFilters(
    objective: SearchableObjective & { status: ObjectiveStatus },
    filters: NormalizedObjectiveListFilters
) {
    if (filters.status && objective.status !== filters.status) {
        return false;
    }
    if (filters.categoryId && objective.categoryId !== filters.categoryId) {
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

        if (filters.status && filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_status_categoryId_deadline', q => {
                    const indexed = q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('status', filters.status!)
                        .eq('categoryId', filters.categoryId!);
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

        if (filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_categoryId_deadline', q => {
                    const indexed = q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('categoryId', filters.categoryId!);
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
        if (filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_user_organization_scope_status_categoryId', q =>
                    q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('scope', 'personal')
                        .eq('status', filters.status!)
                        .eq('categoryId', filters.categoryId!)
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

    if (filters.categoryId) {
        return await ctx.db
            .query('objectives')
            .withIndex('by_user_organization_scope_categoryId', q =>
                q
                    .eq('userId', ctx.userId)
                    .eq('organizationId', organizationId)
                    .eq('scope', 'personal')
                    .eq('categoryId', filters.categoryId!)
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

        if (filters.status && filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status_categoryId_deadline', q => {
                    const indexed = q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', filters.status!)
                        .eq('categoryId', filters.categoryId!);
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

        if (filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_categoryId_deadline', q => {
                    const indexed = q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('categoryId', filters.categoryId!);
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
        if (filters.categoryId) {
            return await ctx.db
                .query('objectives')
                .withIndex('by_organization_scope_status_categoryId', q =>
                    q
                        .eq('organizationId', organizationId)
                        .eq('scope', 'organization')
                        .eq('status', filters.status!)
                        .eq('categoryId', filters.categoryId!)
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

    if (filters.categoryId) {
        return await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope_categoryId', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('scope', 'organization')
                    .eq('categoryId', filters.categoryId!)
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
                  .withSearchIndex('search_title_by_user_organization_scope_status_categoryId', q =>
                      q
                          .search('title', search)
                          .eq('userId', ctx.userId)
                          .eq('organizationId', organizationId)
                          .eq('scope', 'personal')
                  )
            : ctx.db
                  .query('objectives')
                  .withSearchIndex('search_title_by_organization_scope_status_categoryId', q =>
                      q
                          .search('title', search)
                          .eq('organizationId', organizationId)
                          .eq('scope', 'organization')
                  );

    return (await query.take(limit * 5))
        .filter(objective => matchesObjectiveFilters(objective, filters))
        .filter(objective => matchesObjectiveSearch(objective, search))
        .slice(0, limit);
}
