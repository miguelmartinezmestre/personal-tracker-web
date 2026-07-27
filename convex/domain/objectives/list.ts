import type { PaginationOptions } from 'convex/server';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import type { ObjectiveStatus } from '../../utils/constants';
import type { DeadlineRange } from './filters';
import { getDeadlineRangeBounds, matchesDeadlineRange } from './filters';

const SEARCH_LIMIT = 50;

const EMPTY_PAGE = { page: [], continueCursor: '', isDone: true };

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
    role: string;
    memberRole: string | null;
};

type ObjectiveListArgs = ObjectiveListFilters & {
    paginationOpts: PaginationOptions;
    deletionState?: 'active' | 'deleted';
};

export type ObjectiveSearchArgs = ObjectiveListFilters & {
    search: string;
    limit?: number;
};

type SearchableObjective = Pick<
    Doc<'objectives'>,
    '_id' | 'title' | 'categoryId' | 'deadline' | 'ownerId' | 'visibility' | 'deletedAt'
>;

export function normalizeObjectiveListFilters(
    filters: ObjectiveListFilters
): NormalizedObjectiveListFilters {
    return {
        status: filters.status,
        categoryId: filters.categoryId,
        deadlineRange: filters.deadlineRange,
    };
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

export async function listObjectives(ctx: ObjectiveListCtx, args: ObjectiveListArgs) {
    const organizationId = ctx.organizationId;
    if (!organizationId) {
        return EMPTY_PAGE;
    }

    const filters = normalizeObjectiveListFilters(args);
    const paginationOpts = args.paginationOpts;
    const deletionState = args.deletionState ?? 'active';

    const filterPage = (page: Doc<'objectives'>[]) =>
        page.filter(objective => {
            const isDeleted = objective.deletedAt !== undefined;
            if ((deletionState === 'deleted') !== isDeleted) {
                return false;
            }
            if (!matchesObjectiveFilters(objective, filters)) {
                return false;
            }
            // `ctx.db` is already wrapped with the objective RLS policy. Rows
            // reaching this point are visible to the caller, including
            // collaborator-only private objectives, without preloading every
            // collaboration the user has ever accumulated.
            return true;
        });

    if (filters.deadlineRange) {
        const bounds = getDeadlineRangeBounds(filters.deadlineRange);
        const status = filters.status;
        const categoryId = filters.categoryId;
        const query =
            deletionState === 'deleted'
                ? ctx.db.query('objectives').withIndex('by_organization_deadline', q => {
                      const indexed = q.eq('organizationId', organizationId);
                      return bounds.gte !== undefined
                          ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                          : indexed.lt('deadline', bounds.lt);
                  })
                : status && categoryId
                  ? ctx.db
                        .query('objectives')
                        .withIndex('by_organization_deletedAt_status_categoryId_deadline', q => {
                            const indexed = q
                                .eq('organizationId', organizationId)
                                .eq('deletedAt', undefined)
                                .eq('status', status)
                                .eq('categoryId', categoryId);
                            return bounds.gte !== undefined
                                ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                                : indexed.lt('deadline', bounds.lt);
                        })
                  : status
                    ? ctx.db
                          .query('objectives')
                          .withIndex('by_organization_deletedAt_status_deadline', q => {
                              const indexed = q
                                  .eq('organizationId', organizationId)
                                  .eq('deletedAt', undefined)
                                  .eq('status', status);
                              return bounds.gte !== undefined
                                  ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                                  : indexed.lt('deadline', bounds.lt);
                          })
                    : categoryId
                      ? ctx.db
                            .query('objectives')
                            .withIndex('by_organization_deletedAt_categoryId_deadline', q => {
                                const indexed = q
                                    .eq('organizationId', organizationId)
                                    .eq('deletedAt', undefined)
                                    .eq('categoryId', categoryId);
                                return bounds.gte !== undefined
                                    ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                                    : indexed.lt('deadline', bounds.lt);
                            })
                      : ctx.db
                            .query('objectives')
                            .withIndex('by_organization_deletedAt_deadline', q => {
                                const indexed = q
                                    .eq('organizationId', organizationId)
                                    .eq('deletedAt', undefined);
                                return bounds.gte !== undefined
                                    ? indexed.gte('deadline', bounds.gte).lt('deadline', bounds.lt)
                                    : indexed.lt('deadline', bounds.lt);
                            });

        // Convex permits only one paginated query per function execution. RLS
        // can remove rows from the underlying page, so a safe page may be short
        // (or empty) while its continuation cursor still advances the caller.
        const results = await query.order('desc').paginate(paginationOpts);

        return {
            ...results,
            page: filterPage(results.page),
        };
    }

    const status = filters.status;
    const categoryId = filters.categoryId;
    const query =
        deletionState === 'deleted'
            ? ctx.db
                  .query('objectives')
                  .withIndex('by_organization_deletedAt', q =>
                      q.eq('organizationId', organizationId).gt('deletedAt', 0)
                  )
            : status && categoryId
              ? ctx.db
                    .query('objectives')
                    .withIndex('by_organization_deletedAt_status_categoryId', q =>
                        q
                            .eq('organizationId', organizationId)
                            .eq('deletedAt', undefined)
                            .eq('status', status)
                            .eq('categoryId', categoryId)
                    )
              : status
                ? ctx.db
                      .query('objectives')
                      .withIndex('by_organization_deletedAt_status', q =>
                          q
                              .eq('organizationId', organizationId)
                              .eq('deletedAt', undefined)
                              .eq('status', status)
                      )
                : categoryId
                  ? ctx.db
                        .query('objectives')
                        .withIndex('by_organization_deletedAt_categoryId', q =>
                            q
                                .eq('organizationId', organizationId)
                                .eq('deletedAt', undefined)
                                .eq('categoryId', categoryId)
                        )
                  : ctx.db
                        .query('objectives')
                        .withIndex('by_organization_deletedAt', q =>
                            q.eq('organizationId', organizationId).eq('deletedAt', undefined)
                        );

    const results = await query.order('desc').paginate(paginationOpts);

    return {
        ...results,
        page: filterPage(results.page),
    };
}

export async function searchObjectives(ctx: ObjectiveListCtx, args: ObjectiveSearchArgs) {
    const search = args.search.trim();
    const organizationId = ctx.organizationId;
    if (!organizationId || !search) {
        return [];
    }

    const filters = normalizeObjectiveListFilters(args);
    const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), SEARCH_LIMIT);

    const query = ctx.db
        .query('objectives')
        .withSearchIndex('search_title_by_organization_status_categoryId', q => {
            let searchFilter = q
                .search('title', search)
                .eq('organizationId', organizationId)
                .eq('deletedAt', undefined);

            if (filters.status) {
                searchFilter = searchFilter.eq('status', filters.status);
            }
            if (filters.categoryId) {
                searchFilter = searchFilter.eq('categoryId', filters.categoryId);
            }

            return searchFilter;
        });

    // Equality filters belong to the search index and deadline ranges are a
    // database-side query filter. Both therefore run before `take(limit)`;
    // irrelevant or deleted rows can no longer consume the bounded result set.
    if (filters.deadlineRange) {
        const bounds = getDeadlineRangeBounds(filters.deadlineRange);
        const deadlineQuery = query.filter(q => {
            const beforeUpperBound = q.lt(q.field('deadline'), bounds.lt);
            return bounds.gte === undefined
                ? beforeUpperBound
                : q.and(q.gte(q.field('deadline'), bounds.gte), beforeUpperBound);
        });
        return await deadlineQuery.take(limit);
    }

    return await query.take(limit);
}
