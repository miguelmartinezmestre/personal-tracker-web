'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { ObjectiveStatusFilter } from '@/features/objectives/lib/status-filter';

export type ObjectiveSummary = FunctionReturnType<
    typeof api.objectives.listObjectives
>['page'][number];
export function useObjectives(status: ObjectiveStatusFilter, search: string) {
    return usePaginatedList(api.objectives.listObjectives, { status, search });
}
