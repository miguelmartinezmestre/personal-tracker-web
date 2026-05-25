import type { QueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { invalidateConvexQuery } from '@/platform/convex/query-keys';

const OBJECTIVES_FIRST_PAGE = {
    paginationOpts: { numItems: 20, cursor: null },
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
                limit: 50,
            })
        ),
        invalidateConvexQuery(
            queryClient,
            convexQuery(api.objectives.searchOrganizationObjectives, {
                search: '',
                limit: 50,
            })
        ),
    ]);
}
