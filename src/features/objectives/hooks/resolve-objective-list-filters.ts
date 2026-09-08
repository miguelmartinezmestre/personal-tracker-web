import { optionalRouteParam } from '@/features/lib/route-param';
import type { Id } from '@/convex/_generated/dataModel';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import type { FilterOptions } from '@/features/objectives/components/objective-filter-types';
export type DeadlineRange = 'today' | 'week' | 'month' | 'overdue';
export type ResolvedObjectiveListFilters = {
    searchText: string;
    hasSearch: boolean;
    status: ObjectiveStatus | undefined;
    categoryId: Id<'categories'> | undefined;
    deadlineRange: DeadlineRange | undefined;
};
export function resolveObjectiveListFilters(filters: FilterOptions): ResolvedObjectiveListFilters {
    const searchText = filters.search.trim();
    return {
        searchText,
        hasSearch: searchText.length > 0,
        status: filters.status === 'all' ? undefined : filters.status,
        categoryId:
            filters.category === 'all'
                ? undefined
                : (optionalRouteParam(filters.category) as Id<'categories'> | undefined),
        deadlineRange: filters.deadlineRange === 'all' ? undefined : filters.deadlineRange,
    };
}
