'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export type ProgressEntry = FunctionReturnType<typeof api.objectives.listProgress>['page'][number];

export function useProgress(objectiveId: string) {
    return usePaginatedList(api.objectives.listProgress, {
        objectiveId: objectiveId as Id<'objectives'>,
    });
}
