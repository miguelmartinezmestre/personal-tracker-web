'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { ObjectiveStatusFilter } from '@/features/objectives/lib/status-filter';

export type ObjectiveSummary = FunctionReturnType<
    typeof api.objectives.listObjectives
>['page'][number];
export function useObjectives(status: ObjectiveStatusFilter) {
    const pagination = usePaginatedQuery(
        api.objectives.listObjectives,
        { status },
        {
            initialNumItems: 20,
        }
    );

    return {
        data: pagination.results,
        isLoading: pagination.isLoading,
        isFetching: pagination.status === 'LoadingMore',
        hasMore: pagination.status === 'CanLoadMore',
        loadMore: () => pagination.loadMore(20),
    };
}
