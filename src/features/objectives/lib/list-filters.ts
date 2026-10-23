import type { Route } from 'next';

export const OBJECTIVE_STATUS_FILTERS = ['all', 'active', 'completed'] as const;

export const OBJECTIVE_DEADLINE_FILTERS = ['all', 'overdue', 'today', 'week', 'month'] as const;

export const ALL_CATEGORIES = 'all';

export type ObjectiveListFilters = {
    status: (typeof OBJECTIVE_STATUS_FILTERS)[number];
    deadline: (typeof OBJECTIVE_DEADLINE_FILTERS)[number];
    // A category id, or ALL_CATEGORIES.
    category: string;
};

type SearchParamValue = string | string[] | undefined;

function oneOf<T extends string>(options: readonly T[], value: SearchParamValue): T | undefined {
    return options.find(option => option === value);
}

// The filters live only in the URL, so links that drop them also reset them.
export function parseObjectiveListFilters(params: {
    status?: SearchParamValue;
    deadline?: SearchParamValue;
    category?: SearchParamValue;
}): ObjectiveListFilters {
    return {
        status: oneOf(OBJECTIVE_STATUS_FILTERS, params.status) ?? 'all',
        deadline: oneOf(OBJECTIVE_DEADLINE_FILTERS, params.deadline) ?? 'all',
        category: typeof params.category === 'string' ? params.category : ALL_CATEGORIES,
    };
}

function filterQuery({ status, deadline, category }: ObjectiveListFilters): string {
    const params = new URLSearchParams();

    if (status !== 'all') {
        params.set('status', status);
    }

    if (deadline !== 'all') {
        params.set('deadline', deadline);
    }

    if (category !== ALL_CATEGORIES) {
        params.set('category', category);
    }

    return params.toString();
}

export function objectivesListHref(filters: ObjectiveListFilters): Route {
    const query = filterQuery(filters);

    return query ? `/dashboard/objectives?${query}` : '/dashboard/objectives';
}

// The detail link carries the filters so its "back" link can return to the same view.
export function objectiveDetailHref(id: string, filters: ObjectiveListFilters): Route {
    const query = filterQuery(filters);
    const path = `/dashboard/objectives/${id}`;

    return (query ? `${path}?${query}` : path) as Route;
}
