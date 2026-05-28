import type { QueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { invalidateConvexQuery } from '@/platform/convex/query-keys';

export const OBJECTIVES_PAGE_SIZE = 20;
export const OBJECTIVE_SEARCH_LIMIT = 50;

const OBJECTIVES_FIRST_PAGE = {
    paginationOpts: { numItems: OBJECTIVES_PAGE_SIZE, cursor: null },
};

export function invalidateObjectiveListQueries(queryClient: QueryClient) {
    return Promise.all([
        invalidateConvexQuery(
            queryClient,
            convexQuery(api.objectives.getObjectivesByUser, OBJECTIVES_FIRST_PAGE)
        ),
        invalidateConvexQuery(
            queryClient,
            convexQuery(api.objectives.getOrganizationObjectives, OBJECTIVES_FIRST_PAGE)
        ),
        invalidateConvexQuery(
            queryClient,
            convexQuery(api.objectives.searchObjectivesByUser, {
                search: '',
                limit: OBJECTIVE_SEARCH_LIMIT,
            })
        ),
        invalidateConvexQuery(
            queryClient,
            convexQuery(api.objectives.searchOrganizationObjectives, {
                search: '',
                limit: OBJECTIVE_SEARCH_LIMIT,
            })
        ),
    ]);
}

export function invalidateObjectiveMutationQueries(
    queryClient: QueryClient,
    objectiveId?: Id<'objectives'>
) {
    const invalidations: Array<Promise<unknown>> = [invalidateObjectiveListQueries(queryClient)];

    if (objectiveId) {
        invalidations.push(
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.objectives.getObjectiveById, { id: objectiveId })
            )
        );
    }

    return Promise.all(invalidations);
}
