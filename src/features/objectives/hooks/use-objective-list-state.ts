'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { Preloaded, usePreloadedQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import type { FilterOptions } from '@/features/objectives/components/objective-filters';

const DEFAULT_PAGE_SIZE = 20;

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

type PersonalResult = FunctionReturnType<typeof api.objectives.getObjectivesByUser>;
type OrganizationObjectivesResult = FunctionReturnType<
    typeof api.objectives.getOrganizationObjectives
>;
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
    const preloadedOrganizationObjectives = usePreloadedQuery(
        preloadedOrganizationObjectivesQuery
    ) as OrganizationObjectivesResult | undefined;

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

    const organizationPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: organizationPaginationOpts, reset: resetOrganizationPagination } =
        organizationPagination;
    const organizationIsFirstPage = organizationPaginationOpts.cursor === null;

    const organizationQuery = useQuery({
        ...convexQuery(
            api.objectives.getOrganizationObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: organizationPaginationOpts,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        ),
        initialData:
            !hasSearch &&
            organizationIsFirstPage &&
            filters.status === 'all' &&
            filters.category === 'all' &&
            filters.deadlineRange === 'all'
                ? preloadedOrganizationObjectives
                : undefined,
    });

    const organizationSearchQuery = useQuery(
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
    const organizationContinueCursor = organizationQuery.data?.continueCursor ?? null;
    const organizationPageIsDone = organizationQuery.data?.isDone ?? false;
    const organizationHasNextPage = Boolean(organizationContinueCursor) && !organizationPageIsDone;

    const personalObjectives: Doc<'objectives'>[] = hasSearch
        ? (personalSearchQuery.data ?? [])
        : (personalQuery.data?.page ?? []);
    const organizationObjectives: Doc<'objectives'>[] = hasSearch
        ? (organizationSearchQuery.data ?? [])
        : (organizationQuery.data?.page ?? []);

    const handleFiltersChange = (nextFilters: FilterOptions) => {
        const shouldResetPagination =
            nextFilters.status !== filters.status ||
            nextFilters.category !== filters.category ||
            nextFilters.deadlineRange !== filters.deadlineRange ||
            nextFilters.search !== filters.search;

        if (shouldResetPagination) {
            resetPersonalPagination();
            resetOrganizationPagination();
        }

        setFilters(nextFilters);
    };

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
            pagination: organizationPagination,
            hasNextPage: organizationHasNextPage,
            isLoading: hasSearch ? organizationSearchQuery.isLoading : organizationQuery.isLoading,
            isFetching: organizationQuery.isFetching,
            onNextPage: () =>
                organizationPagination.nextPage(organizationContinueCursor, organizationPageIsDone),
        },
    };
}
