'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export type ProgressEntry = FunctionReturnType<typeof api.progress.listProgress>['page'][number];

export function useProgress(objectiveId: Id<'objectives'>) {
    return usePaginatedList(api.progress.listProgress, { objectiveId });
}
