'use client';

import {
    usePaginatedQuery,
    type PaginatedQueryArgs,
    type PaginatedQueryReference,
} from 'convex/react';

const PAGE_SIZE = 20;

export function usePaginatedList<Query extends PaginatedQueryReference>(
    query: Query,
    args: PaginatedQueryArgs<Query> | 'skip'
) {
    const pagination = usePaginatedQuery(query, args, { initialNumItems: PAGE_SIZE });
    const isFetching = pagination.status === 'LoadingMore';

    return {
        data: pagination.results,
        // Convex's own isLoading is also true while loading more, which would blank the list.
        isLoading: pagination.status === 'LoadingFirstPage',
        isFetching,
        // The backend only reports more when a next page really exists, and flips this back when
        // one appears, so the button can stay put and just enable or disable.
        canLoadMore: pagination.status === 'CanLoadMore',
        loadMore: () => pagination.loadMore(PAGE_SIZE),
    };
}

export type PaginatedList = Omit<ReturnType<typeof usePaginatedList>, 'data'>;
