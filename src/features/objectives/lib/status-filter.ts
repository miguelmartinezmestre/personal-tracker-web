import type { Route } from 'next';

export type ObjectiveStatusFilter = 'all' | 'active' | 'completed';

export const OBJECTIVE_STATUS_FILTERS: readonly ObjectiveStatusFilter[] = [
    'all',
    'active',
    'completed',
];

export function parseObjectiveStatusFilter(
    value: string | string[] | undefined
): ObjectiveStatusFilter {
    return OBJECTIVE_STATUS_FILTERS.find(filter => filter === value) ?? 'all';
}

export function objectivesListHref(status: ObjectiveStatusFilter): Route {
    return status === 'all' ? '/dashboard/objectives' : `/dashboard/objectives?status=${status}`;
}

// The detail link carries the filter so its "back" link can return to the same view.
export function objectiveDetailHref(id: string, status: ObjectiveStatusFilter): Route {
    const path = `/dashboard/objectives/${id}`;
    return (status === 'all' ? path : `${path}?status=${status}`) as Route;
}
