'use client';

import { requiredRouteParam } from '@/features/lib/route-param';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import type { Id } from '@/convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { useUpdateProgressTableColumns } from '../components/update-progress-table-columns';
import { useDeleteUpdateProgress } from '../components/update-progress-table-actions';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';
import {
    buildProgressPoints,
    lastProgressUpdateDate,
    unitSuffixFromObjective,
} from '../lib/progress-points';
import type { FunctionReturnType } from 'convex/server';
type ProgressPage = FunctionReturnType<typeof api.update_progress.getUpdateProgressByObjectiveId>;
function shouldFetchObjective(isAuthenticated: boolean, hasObjectiveProp: boolean): boolean {
    return isAuthenticated && !hasObjectiveProp;
}
function paginationFromPage(data: ProgressPage | undefined): {
    continueCursor: string | null;
    pageIsDone: boolean;
    hasNextPage: boolean;
    page: ProgressPage['page'];
} {
    if (!data) {
        const page: ProgressPage['page'] = [];
        return {
            continueCursor: null,
            pageIsDone: false,
            hasNextPage: false,
            page,
        };
    }
    const continueCursor = data.continueCursor;
    const pageIsDone = data.isDone;
    return {
        continueCursor,
        pageIsDone,
        hasNextPage: Boolean(continueCursor) && !pageIsDone,
        page: data.page,
    };
}
function resolveObjectiveDoc(
    objectiveProp: ObjectiveWithCapabilities | null,
    queriedObjective: ObjectiveWithCapabilities | null | undefined
): ObjectiveWithCapabilities | null {
    if (objectiveProp) {
        return objectiveProp;
    }
    if (queriedObjective) {
        return queriedObjective;
    }
    return null;
}
export function useUpdateProgressTableData(
    objectiveProp: ObjectiveWithCapabilities | null,
    currentUserId: Id<'user'> | null
) {
    const params = useParams();
    const objectiveId = requiredRouteParam(params.id) as Id<'objectives'>;
    const { isAuthenticated } = useConvexAuth();
    const { paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const updateProgress = useQuery({
        ...convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts,
        }),
        enabled: isAuthenticated,
    });
    const objective = useQuery({
        ...convexQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        enabled: shouldFetchObjective(isAuthenticated, Boolean(objectiveProp)),
    });
    const progressSeries = useQuery({
        ...convexQuery(api.update_progress.getProgressSeriesByObjectiveId, { objectiveId }),
        enabled: isAuthenticated,
    });
    const {
        continueCursor,
        pageIsDone,
        hasNextPage,
        page: updates,
    } = paginationFromPage(updateProgress.data);
    const { deleteUpdateProgressAsync, isDeletingProgress } = useDeleteUpdateProgress();
    const objectiveDoc = resolveObjectiveDoc(objectiveProp, objective.data);
    const columns = useUpdateProgressTableColumns({
        objective: objectiveDoc,
        currentUserId,
    });
    const chartUpdates = progressSeries.data?.points ?? [];
    const progressData = buildProgressPoints(
        chartUpdates,
        objectiveDoc,
        progressSeries.data?.seriesStartValue
    );
    const lastUpdated = lastProgressUpdateDate(chartUpdates);
    const unitSuffix = unitSuffixFromObjective(objectiveDoc?.unit);
    return {
        isError: updateProgress.isError || progressSeries.isError || objective.isError,
        retry: () => {
            void updateProgress.refetch();
            void progressSeries.refetch();
            if (!objectiveProp) {
                void objective.refetch();
            }
        },
        nextPage,
        previousPage,
        hasPreviousPage,
        continueCursor,
        pageIsDone,
        hasNextPage,
        updateProgress,
        deleteUpdateProgressAsync,
        isDeletingProgress,
        objectiveDoc,
        columns,
        updates,
        progressData,
        isTruncated: progressSeries.data?.isTruncated ?? false,
        lastUpdated,
        unitSuffix,
    };
}
