'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export type ProgressEntry = FunctionReturnType<typeof api.objectives.listProgress>['page'][number];

export function useProgress(objectiveId: string) {
    const pagination = usePaginatedQuery(
        api.objectives.listProgress,
        { objectiveId: objectiveId as Id<'objectives'> },
        { initialNumItems: 20 }
    );

    return {
        data: pagination.results,
        isLoading: pagination.isLoading,
        isFetching: pagination.status === 'LoadingMore',
        hasMore: pagination.status === 'CanLoadMore',
        loadMore: () => pagination.loadMore(20),
    };
}
