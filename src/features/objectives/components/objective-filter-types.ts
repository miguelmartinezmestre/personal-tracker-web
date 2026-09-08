import type { ObjectiveStatus } from '@/convex/utils/constants';
import type { DeadlineRange } from '@/features/objectives/hooks/resolve-objective-list-filters';

export type ObjectiveStatusFilter = 'all' | ObjectiveStatus;
export type DeadlineRangeFilter = 'all' | DeadlineRange;

export interface FilterOptions {
    search: string;
    status: ObjectiveStatusFilter;
    category: string;
    deadlineRange: DeadlineRangeFilter;
}

export function isObjectiveStatusFilter(value: string): value is ObjectiveStatusFilter {
    return value === 'all' || value === 'active' || value === 'completed';
}

export function isDeadlineRangeFilter(value: string): value is DeadlineRangeFilter {
    return (
        value === 'all' ||
        value === 'today' ||
        value === 'week' ||
        value === 'month' ||
        value === 'overdue'
    );
}

export const EMPTY_OBJECTIVE_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};
