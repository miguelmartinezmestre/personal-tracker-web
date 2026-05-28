'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import type { FilterOptions } from '@/features/objectives/components/objective-filters';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { OBJECTIVE_SEARCH_LIMIT } from '@/features/objectives/lib/objective-query-invalidation';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

type DeadlineRange = 'today' | 'week' | 'month' | 'overdue';

export function useObjectiveListState() {
    const [filters, setFilters] = React.useState<FilterOptions>(() => ({ ...DEFAULT_FILTERS }));
    const searchText = filters.search.trim();
    const hasSearch = searchText.length > 0;
    const statusFilter = filters.status !== 'all' ? (filters.status as ObjectiveStatus) : undefined;
    const categoryFilter =
        filters.category !== 'all' ? (filters.category as Id<'categories'>) : undefined;
    const deadlineRangeFilter =
        filters.deadlineRange !== 'all' ? (filters.deadlineRange as DeadlineRange) : undefined;

    const personalPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: personalPaginationOpts, reset: resetPersonalPagination } =
        personalPagination;

    const personalQuery = useQuery(
        convexQuery(
            api.objectives.getObjectivesByUser,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: personalPaginationOpts,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        )
    );

    const personalSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchObjectivesByUser,
            hasSearch
                ? {
                      search: searchText,
                      limit: OBJECTIVE_SEARCH_LIMIT,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const organizationPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: organizationPaginationOpts, reset: resetOrganizationPagination } =
        organizationPagination;

    const organizationQuery = useQuery(
        convexQuery(
            api.objectives.getOrganizationObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: organizationPaginationOpts,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        )
    );

    const organizationSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchOrganizationObjectives,
            hasSearch
                ? {
                      search: searchText,
                      limit: OBJECTIVE_SEARCH_LIMIT,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const { categoryOptions, categoryNameById } = useObjectiveCategoryOptions();

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
        categories: categoryOptions,
        categoryNameById,
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
