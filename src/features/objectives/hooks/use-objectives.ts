'use client';

import type { FunctionReturnType } from 'convex/server';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { todayTimestamp } from '@/features/objectives/lib/dates';
import { ALL_CATEGORIES, type ObjectiveListFilters } from '@/features/objectives/lib/list-filters';

export type ObjectiveSummary = FunctionReturnType<
    typeof api.objectives.listObjectives
>['page'][number];

export function useObjectives(
    { status, deadline, category }: ObjectiveListFilters,
    search: string
) {
    return usePaginatedList(api.objectives.listObjectives, {
        status,
        search,
        categoryId: category === ALL_CATEGORIES ? undefined : category,
        deadline: deadline === 'all' ? undefined : { filter: deadline, today: todayTimestamp() },
    });
}
