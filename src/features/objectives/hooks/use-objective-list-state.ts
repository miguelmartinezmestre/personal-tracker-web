'use client';

import { extractErrorCode } from '@/lib/error-messages';
import { queryState } from '@/lib/query-state';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import type { FilterOptions } from '@/features/objectives/components/objective-filter-types';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { resolveObjectiveListFilters } from '@/features/objectives/hooks/resolve-objective-list-filters';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';
import { useReferenceNow } from '@/lib/reference-now';
import { toUtcCivilDay } from '@shared/civil-date';

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

function pageDetails(
    data:
        | {
              page: ObjectiveWithCapabilities[];
              continueCursor: string;
              isDone: boolean;
              needsContinuation?: boolean;
          }
        | undefined
) {
    const cursor = data?.continueCursor ?? null;
    const done = data?.isDone ?? false;
    return {
        rows: data?.page ?? [],
        cursor,
        done,
        continuing: Boolean(data?.needsContinuation),
        hasNext: Boolean(cursor) && !done,
    };
}

export function useObjectiveListState() {
    const [filters, setFilters] = React.useState<FilterOptions>(() => ({ ...DEFAULT_FILTERS }));
    const { searchText, hasSearch, status, categoryId, deadlineRange } =
        resolveObjectiveListFilters(filters);
    const referenceNow = useReferenceNow();
    const referenceDay = deadlineRange ? toUtcCivilDay(referenceNow) : undefined;

    const pagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts, reset: resetPagination } = pagination;
    const trashPagination = useServerPagination(DEFAULT_PAGE_SIZE, 'trash');
    const { paginationOpts: trashPaginationOpts } = trashPagination;

    const listQuery = useQuery(
        convexQuery(
            api.objectives.getObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts,
                      status,
                      categoryId,
                      deadlineRange,
                      now: referenceDay,
                  }
        )
    );

    const searchQuery = useQuery(
        convexQuery(
            api.objectives.searchObjectivesPaginated,
            hasSearch
                ? {
                      search: searchText,
                      paginationOpts,
                      status,
                      categoryId,
                      deadlineRange,
                      now: referenceDay,
                  }
                : 'skip'
        )
    );
    const trashQuery = useQuery(
        convexQuery(api.objectives.getDeletedObjectives, {
            paginationOpts: trashPaginationOpts,
        })
    );

    const { categoryOptions, categoryNameById, categoriesQuery } = useObjectiveCategoryOptions();

    const visiblePage = hasSearch ? searchQuery.data : listQuery.data;
    const details = pageDetails(visiblePage);
    const trashDetails = pageDetails(trashQuery.data);

    const objectives = details.rows;
    const followList = pagination.follow;
    const followTrash = trashPagination.follow;
    React.useEffect(() => followList(visiblePage), [followList, visiblePage]);
    React.useEffect(() => followTrash(trashQuery.data), [followTrash, trashQuery.data]);

    const activeQuery = hasSearch ? searchQuery : listQuery;
    const isLoading = activeQuery.isPending || categoriesQuery.isPending || details.continuing;
    const isError = activeQuery.isError || categoriesQuery.isError;
    const state = queryState(
        {
            data: activeQuery.data === undefined ? undefined : objectives,
            isLoading,
            isError,
            error: activeQuery.error ?? categoriesQuery.error,
        },
        rows => rows.length === 0
    );

    React.useEffect(() => {
        if (extractErrorCode(activeQuery.error) === 'INVALID_CURSOR') {
            resetPagination();
        }
    }, [activeQuery.error, resetPagination]);

    const handleFiltersChange = (nextFilters: FilterOptions) => {
        resetPagination();
        setFilters(nextFilters);
    };

    return {
        state,
        isError,
        retry: () => {
            resetPagination();
            void activeQuery.refetch();
            void categoriesQuery.refetch();
        },
        isTrashError: trashQuery.isError,
        retryTrash: () => {
            void trashQuery.refetch();
        },
        filters,
        categories: categoryOptions,
        categoryNameById,
        handleFiltersChange,
        objectives,
        deletedObjectives: trashDetails.rows,
        pagination,
        trashPagination,
        hasNextPage: details.hasNext,
        trashHasNextPage: trashDetails.hasNext,
        isLoading,
        isFetching: activeQuery.isFetching || details.continuing,
        isTrashLoading: trashQuery.isPending || trashDetails.continuing,
        isTrashFetching: trashQuery.isFetching,
        onNextPage: () => pagination.nextPage(details.cursor, details.done),
        onNextTrashPage: () => trashPagination.nextPage(trashDetails.cursor, trashDetails.done),
    };
}
