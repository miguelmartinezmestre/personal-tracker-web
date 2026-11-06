'use client';

import { useState } from 'react';
import type { PaginatedQueryArgs, PaginatedQueryReference } from 'convex/react';
import { usePaginatedQuery } from 'convex-helpers/react';

const PAGE_SIZE = 20;

export function usePaginatedList<Query extends PaginatedQueryReference>(
    query: Query,
    args: PaginatedQueryArgs<Query> | 'skip'
) {
    const pagination = usePaginatedQuery(query, args, { initialNumItems: PAGE_SIZE });
    const isLoadingFirstPage = pagination.status === 'LoadingFirstPage';
    const [settledResults, setSettledResults] = useState(pagination.results);

    if (!isLoadingFirstPage && settledResults !== pagination.results) {
        setSettledResults(pagination.results);
    }

    const keepsPreviousResults = isLoadingFirstPage && args !== 'skip' && settledResults.length > 0;

    return {
        data: keepsPreviousResults ? settledResults : pagination.results,
        // Convex's own isLoading is also true while loading more, which would blank the list.
        isLoading: isLoadingFirstPage && !keepsPreviousResults,
        isFetching: pagination.status === 'LoadingMore' || keepsPreviousResults,
        canLoadMore: pagination.status === 'CanLoadMore',
        loadMore: () => pagination.loadMore(PAGE_SIZE),
    };
}

export type PaginatedList = Omit<ReturnType<typeof usePaginatedList>, 'data'>;
