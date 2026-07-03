'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import type { FilterOptions } from '@/features/objectives/components/objective-filters';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';

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

    const pagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts, reset: resetPagination } = pagination;

    const listQuery = useQuery(
        convexQuery(
            api.objectives.getObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        )
    );

    const searchQuery = useQuery(
        convexQuery(
            api.objectives.searchObjectivesQuery,
            hasSearch
                ? {
                      search: searchText,
                      limit: DEFAULT_PAGE_SIZE,
                      status: statusFilter,
                      categoryId: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const { categoryOptions, categoryNameById } = useObjectiveCategoryOptions();

    const continueCursor = listQuery.data?.continueCursor ?? null;
    const pageIsDone = listQuery.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const objectives: ObjectiveWithCapabilities[] = hasSearch
        ? (searchQuery.data ?? [])
        : (listQuery.data?.page ?? []);

    const handleFiltersChange = (nextFilters: FilterOptions) => {
        const shouldResetPagination =
            nextFilters.status !== filters.status ||
            nextFilters.category !== filters.category ||
            nextFilters.deadlineRange !== filters.deadlineRange ||
            nextFilters.search !== filters.search;

        if (shouldResetPagination) {
            resetPagination();
        }

        setFilters(nextFilters);
    };

    return {
        filters,
        hasSearch,
        categories: categoryOptions,
        categoryNameById,
        handleFiltersChange,
        objectives,
        pagination,
        hasNextPage,
        isLoading: hasSearch ? searchQuery.isLoading : listQuery.isLoading,
        isFetching: listQuery.isFetching,
        onNextPage: () => pagination.nextPage(continueCursor, pageIsDone),
    };
}
