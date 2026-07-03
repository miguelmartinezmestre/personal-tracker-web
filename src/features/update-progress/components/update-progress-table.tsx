'use client';

import { DataTable } from '@/components/data-table/components/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { ObjectiveProgressGraph } from '@/features/objectives/components/objective-graph';
import dynamic from 'next/dynamic';

const ObjectiveProgressTimeline = dynamic(() => import('./objective-progress-timeline'), {
    ssr: false,
});
import { useUpdateProgressTableColumns } from './update-progress-table-columns';
import UpdateProgressFormModal from './update-progress-form-edit-modal';
import { useDeleteUpdateProgress } from './update-progress-table-actions';
import { mapDocToUpdateProgress } from '@/features/update-progress/lib/map-doc-to-update-progress';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate, formatTime } from '@/lib/format-date';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';

const MOBILE_SKELETON_ITEMS = [1, 2, 3];

type UpdateProgressTableProps = {
    objective: ObjectiveWithCapabilities | null;
    currentUserId: Id<'user'> | null;
};

export default function UpdateProgressTable({
    objective: objectiveProp,
    currentUserId,
}: UpdateProgressTableProps) {
    const t = useTranslations('UpdateProgress');
    const tTable = useTranslations('Table');
    const locale = useLocale();
    const params = useParams();
    const objectiveIdParam = params.id;
    const rawObjectiveId = Array.isArray(objectiveIdParam) ? objectiveIdParam[0] : objectiveIdParam;

    if (!rawObjectiveId || typeof rawObjectiveId !== 'string') {
        throw new Error('Invalid objective ID');
    }

    const objectiveId: Id<'objectives'> = rawObjectiveId as Id<'objectives'>;
    const { isAuthenticated } = useConvexAuth();

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
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
        enabled: isAuthenticated && !objectiveProp,
    });
    const progressSeries = useQuery({
        ...convexQuery(api.update_progress.getProgressSeriesByObjectiveId, { objectiveId }),
        enabled: isAuthenticated,
    });

    const continueCursor = updateProgress.data?.continueCursor ?? null;
    const pageIsDone = updateProgress.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const { deleteUpdateProgressAsync, isDeletingProgress } = useDeleteUpdateProgress();

    const columns = useUpdateProgressTableColumns({
        objectiveId,
        objective:
            objectiveProp ?? (objective.data as ObjectiveWithCapabilities | undefined) ?? null,
        currentUserId,
    });

    const updates = updateProgress.data?.page ?? [];
    const chartUpdates = progressSeries.data?.points ?? updates;
    const objectiveDoc = (objectiveProp ?? objective.data) as
        | (ObjectiveWithCapabilities & {
              startValue?: number;
          })
        | undefined;

    const canEditProgressRow = (authorId: Id<'user'>) => {
        if (!objectiveDoc || !currentUserId) return false;
        if (authorId === currentUserId) return true;
        return objectiveDoc.capabilities.canEditDefinition;
    };

    const sortedUpdates = [...chartUpdates].sort((a, b) => a.updateDate - b.updateDate);
    const baseValue = objectiveDoc?.startValue ?? 0;

    type ProgressPoint = { date: number; currentValue: number; objective: number };
    const targetValue = objectiveDoc?.targetValue ?? 0;
    const progressData: ProgressPoint[] = sortedUpdates.reduce<ProgressPoint[]>(
        (progressPoints, progressUpdate: Doc<'progressUpdates'>) => {
            const previousCumulativeValue =
                progressPoints.length > 0
                    ? progressPoints[progressPoints.length - 1]?.currentValue
                    : baseValue;
            if (previousCumulativeValue === undefined) {
                throw new Error('Unexpected undefined value in progress calculation');
            }
            progressPoints.push({
                date: progressUpdate.updateDate,
                currentValue: previousCumulativeValue + progressUpdate.updatedValue,
                objective: targetValue,
            });
            return progressPoints;
        },
        []
    );
    const lastUpdated = sortedUpdates.at(-1)?.updateDate ?? null;

    const unitSuffix = objectiveDoc?.unit ? ` ${objectiveDoc.unit}` : '';

    return (
        <div className="w-full min-w-0 space-y-4">
            {progressData.length > 0 && (
                <ObjectiveProgressGraph
                    data={progressData}
                    unit={objectiveDoc?.unit ?? null}
                    targetValue={objectiveDoc?.targetValue ?? null}
                    startValue={objectiveDoc?.startValue ?? null}
                    lastUpdated={lastUpdated}
                />
            )}

            {progressData.length >= 2 && (
                <ObjectiveProgressTimeline
                    data={progressData}
                    unit={objectiveDoc?.unit ?? null}
                    targetValue={objectiveDoc?.targetValue ?? null}
                />
            )}

            <div className="w-full min-w-0 space-y-3 md:hidden">
                {updateProgress.isLoading ? (
                    MOBILE_SKELETON_ITEMS.map(item => (
                        <div key={item} className="h-36 rounded-lg bg-muted animate-pulse" />
                    ))
                ) : updates.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-muted-foreground">{tTable('noResults')}</p>
                    </div>
                ) : (
                    updates.map(progressRow => {
                        const defaultValues = mapDocToUpdateProgress(progressRow);

                        return (
                            <Card key={progressRow._id} className="w-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-muted-foreground">
                                                {t('table.columns.date')}
                                            </p>
                                            <p className="font-medium">
                                                {formatDate(progressRow.updateDate, locale)} -{' '}
                                                {formatTime(progressRow.updateDate, locale)}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm text-muted-foreground">
                                                {t('table.columns.currentValue')}
                                            </p>
                                            <p className="text-lg font-semibold">
                                                {progressRow.updatedValue}
                                                {unitSuffix}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-md border p-3">
                                        <p className="text-sm text-muted-foreground">
                                            {t('table.columns.comment')}
                                        </p>
                                        <p className="mt-1 text-sm break-words">
                                            {progressRow.comment?.trim() || '-'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 border-t pt-2">
                                        {canEditProgressRow(progressRow.createdBy) ? (
                                            <>
                                                <UpdateProgressFormModal
                                                    defaultValues={defaultValues}
                                                    objectiveId={objectiveId}
                                                />
                                                <DeleteConfirmationDialog
                                                    onConfirm={async () => {
                                                        await deleteUpdateProgressAsync({
                                                            _id: progressRow._id as Id<'progressUpdates'>,
                                                        });
                                                    }}
                                                    title={t('confirm.deleteTitle')}
                                                    description={t('confirm.deleteDescription')}
                                                    triggerLabel={t('table.columns.delete')}
                                                    confirmLabel={t('confirm.deleteConfirm')}
                                                    cancelLabel={t('confirm.cancel')}
                                                    isLoading={isDeletingProgress}
                                                    trigger={
                                                        <Button
                                                            data-testid="progress-delete-button"
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            {t('table.columns.delete')}
                                                        </Button>
                                                    }
                                                />
                                            </>
                                        ) : null}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
                {updates.length > 0 && (hasPreviousPage || hasNextPage) && (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={previousPage}
                            disabled={!hasPreviousPage || updateProgress.isFetching}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {tTable('showing')} {updates.length} {tTable('rows')}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => nextPage(continueCursor, pageIsDone)}
                            disabled={!hasNextPage || updateProgress.isFetching}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="hidden w-full min-w-0 md:block">
                <DataTable
                    columns={columns}
                    data={updateProgress.data?.page ?? []}
                    isLoading={updateProgress.isLoading}
                    pagination={{
                        currentPage,
                        onNextPage: () => nextPage(continueCursor, pageIsDone),
                        onPreviousPage: previousPage,
                        hasNextPage,
                        hasPreviousPage,
                        isLoading: updateProgress.isFetching,
                    }}
                />
            </div>
        </div>
    );
}
