'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { Preloaded, usePreloadedQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import type { FilterOptions } from '@/features/objectives/components/objective-filters';

const DEFAULT_PAGE_SIZE = 20;

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

type PersonalResult = FunctionReturnType<typeof api.objectives.getObjectivesByUser>;
type OrgResult = FunctionReturnType<typeof api.objectives.getOrganizationObjectives>;
type DeadlineRange = 'today' | 'week' | 'month' | 'overdue';

type UseObjectiveListStateArgs = {
    preloadedPersonalObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser>;
    preloadedOrganizationObjectivesQuery: Preloaded<
        typeof api.objectives.getOrganizationObjectives
    >;
};

export function useObjectiveListState({
    preloadedPersonalObjectivesQuery,
    preloadedOrganizationObjectivesQuery,
}: UseObjectiveListStateArgs) {
    const [filters, setFilters] = React.useState<FilterOptions>(() => ({ ...DEFAULT_FILTERS }));
    const searchText = filters.search.trim();
    const hasSearch = searchText.length > 0;
    const statusFilter = filters.status !== 'all' ? (filters.status as ObjectiveStatus) : undefined;
    const categoryFilter = filters.category !== 'all' ? filters.category : undefined;
    const deadlineRangeFilter =
        filters.deadlineRange !== 'all' ? (filters.deadlineRange as DeadlineRange) : undefined;

    const preloadedPersonal = usePreloadedQuery(preloadedPersonalObjectivesQuery) as
        | PersonalResult
        | undefined;
    const preloadedOrg = usePreloadedQuery(preloadedOrganizationObjectivesQuery) as
        | OrgResult
        | undefined;

    const personalPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: personalPaginationOpts, reset: resetPersonalPagination } =
        personalPagination;
    const personalIsFirstPage = personalPaginationOpts.cursor === null;

    const personalQuery = useQuery({
        ...convexQuery(
            api.objectives.getObjectivesByUser,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: personalPaginationOpts,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        ),
        initialData:
            !hasSearch &&
            personalIsFirstPage &&
            filters.status === 'all' &&
            filters.category === 'all' &&
            filters.deadlineRange === 'all'
                ? preloadedPersonal
                : undefined,
    });

    const personalSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchObjectivesByUser,
            hasSearch
                ? {
                      search: searchText,
                      limit: 50,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const orgPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: orgPaginationOpts, reset: resetOrgPagination } = orgPagination;
    const orgIsFirstPage = orgPaginationOpts.cursor === null;

    const orgQuery = useQuery({
        ...convexQuery(
            api.objectives.getOrganizationObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: orgPaginationOpts,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        ),
        initialData:
            !hasSearch &&
            orgIsFirstPage &&
            filters.status === 'all' &&
            filters.category === 'all' &&
            filters.deadlineRange === 'all'
                ? preloadedOrg
                : undefined,
    });

    const orgSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchOrganizationObjectives,
            hasSearch
                ? {
                      search: searchText,
                      limit: 50,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const categoryOptionsQuery = useQuery(
        convexQuery(api.categories.getCategoryNamesForFilters, {})
    );

    const personalContinueCursor = personalQuery.data?.continueCursor ?? null;
    const personalPageIsDone = personalQuery.data?.isDone ?? false;
    const personalHasNextPage = Boolean(personalContinueCursor) && !personalPageIsDone;
    const orgContinueCursor = orgQuery.data?.continueCursor ?? null;
    const orgPageIsDone = orgQuery.data?.isDone ?? false;
    const orgHasNextPage = Boolean(orgContinueCursor) && !orgPageIsDone;

    const personalObjectives = React.useMemo<Doc<'objectives'>[]>(
        () => (hasSearch ? (personalSearchQuery.data ?? []) : (personalQuery.data?.page ?? [])),
        [hasSearch, personalQuery.data?.page, personalSearchQuery.data]
    );
    const organizationObjectives = React.useMemo<Doc<'objectives'>[]>(
        () => (hasSearch ? (orgSearchQuery.data ?? []) : (orgQuery.data?.page ?? [])),
        [hasSearch, orgQuery.data?.page, orgSearchQuery.data]
    );

    const handleFiltersChange = React.useCallback(
        (nextFilters: FilterOptions) => {
            const shouldResetPagination =
                nextFilters.status !== filters.status ||
                nextFilters.category !== filters.category ||
                nextFilters.deadlineRange !== filters.deadlineRange ||
                nextFilters.search !== filters.search;

            if (shouldResetPagination) {
                resetPersonalPagination();
                resetOrgPagination();
            }

            setFilters(nextFilters);
        },
        [
            filters.status,
            filters.category,
            filters.deadlineRange,
            filters.search,
            resetOrgPagination,
            resetPersonalPagination,
        ]
    );

    return {
        filters,
        hasSearch,
        categories: categoryOptionsQuery.data ?? [],
        handleFiltersChange,
        personal: {
            objectives: personalObjectives,
            pagination: personalPagination,
            hasNextPage: personalHasNextPage,
            isLoading: hasSearch ? personalSearchQuery.isLoading : personalQuery.isLoading,
            isFetching: personalQuery.isFetching,
            onNextPage: () =>
                personalPagination.nextPage(personalContinueCursor, personalPageIsDone),
        },
        organization: {
            objectives: organizationObjectives,
            pagination: orgPagination,
            hasNextPage: orgHasNextPage,
            isLoading: hasSearch ? orgSearchQuery.isLoading : orgQuery.isLoading,
            isFetching: orgQuery.isFetching,
            onNextPage: () => orgPagination.nextPage(orgContinueCursor, orgPageIsDone),
        },
    };
}
