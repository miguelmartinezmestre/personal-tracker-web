'use client';

import { useEffect } from 'react';
import { DataTable } from '@/features/table/components/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { ObjectiveProgressGraph } from '@/features/objectives/components/objective-graph';
import dynamic from 'next/dynamic';

const ObjectiveProgressTimeline = dynamic(() => import('./objective-progress-timeline'), {
    ssr: false,
});
import { useUpdateProgressTableColumns } from './update-progress-table-columns';
import UpdateProgressFormModal from './update-progress-form-edit-modal';
import { useDeleteUpdateProgress } from './update-progress-table-actions';
import { UpdateProgress } from '@/features/update-progress/schemas/update-progress';
import { useTranslations } from 'next-intl';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 20;

type ProgressResult = FunctionReturnType<typeof api.update_progress.getUpdateProgressByObjectiveId>;
type ObjectiveResult = FunctionReturnType<typeof api.objectives.getObjectiveById>;
const MOBILE_SKELETON_ITEMS = [1, 2, 3];

interface UpdateProgressTableProps {
    initialProgress: ProgressResult | undefined;
    initialObjective: ObjectiveResult | undefined;
}

export default function UpdateProgressTable({
    initialProgress,
    initialObjective,
}: UpdateProgressTableProps) {
    const t = useTranslations('UpdateProgress');
    const tTable = useTranslations('Table');
    const params = useParams();
    const objectiveIdParam = params.id;
    const rawObjectiveId = Array.isArray(objectiveIdParam) ? objectiveIdParam[0] : objectiveIdParam;

    if (!rawObjectiveId || typeof rawObjectiveId !== 'string') {
        throw new Error('Invalid objective ID');
    }

    const objectiveId: Id<'objectives'> = rawObjectiveId as Id<'objectives'>;

    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
    } = useServerPagination(DEFAULT_PAGE_SIZE);

    const paginationOpts = getPaginationOpts(currentPage);
    const isFirstPage = paginationOpts.cursor === null;

    const updateProgress = useQuery({
        ...convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts,
        }),
        initialData: isFirstPage ? initialProgress : undefined,
    });

    const objective = useQuery({
        ...convexQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        initialData: initialObjective,
    });

    const hasData = updateProgress.data !== undefined;
    const continueCursor = updateProgress.data?.continueCursor ?? null;
    const pageIsDone = updateProgress.data?.isDone ?? false;

    useEffect(() => {
        if (!hasData || updateProgress.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, updateProgress.isFetching, updateCursor]);

    const { deleteUpdateProgressAsync, isDeletingProgress } = useDeleteUpdateProgress(objectiveId);

    const columns = useUpdateProgressTableColumns({ objectiveId });

    const updates = updateProgress.data?.page ?? [];
    const objectiveDoc = objective.data as
        | (Doc<'objectives'> & {
              startValue?: number;
          })
        | undefined;

    const sortedUpdates = [...updates].sort((a, b) => a.updateDate - b.updateDate);
    const baseValue = objectiveDoc?.startValue ?? 0;

    type ProgressPoint = { date: number; currentValue: number; objective: number };
    const targetValue = objectiveDoc?.targetValue ?? 0;
    const progressData: ProgressPoint[] = sortedUpdates.reduce<ProgressPoint[]>(
        (acc, item: Doc<'progressUpdates'>) => {
            const prev = acc.length > 0 ? acc[acc.length - 1]?.currentValue : baseValue;
            if (prev === undefined) {
                throw new Error('Unexpected undefined value in progress calculation');
            }
            acc.push({
                date: item.updateDate,
                currentValue: prev + item.updatedValue,
                objective: targetValue,
            });
            return acc;
        },
        []
    );
    const lastUpdated = sortedUpdates.at(-1)?.updateDate ?? null;

    const unitSuffix = objectiveDoc?.unit ? ` ${objectiveDoc.unit}` : '';

    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

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
                        const defaultValues = {
                            _id: progressRow._id,
                            updatedValue: progressRow.updatedValue,
                            updateDate: new Date(progressRow.updateDate),
                            comment: progressRow.comment ?? null,
                        } satisfies UpdateProgress;

                        return (
                            <Card key={progressRow._id} className="w-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-muted-foreground">
                                                {t('table.columns.date')}
                                            </p>
                                            <p className="font-medium">
                                                {new Date(
                                                    progressRow.updateDate
                                                ).toLocaleDateString()}{' '}
                                                -{' '}
                                                {new Date(
                                                    progressRow.updateDate
                                                ).toLocaleTimeString()}
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
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={!hasPreviousPage}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={!hasNextPage}
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
                        totalPages,
                        onPageChange: goToPage,
                        hasNextPage,
                        hasPreviousPage,
                        pageSize: DEFAULT_PAGE_SIZE,
                    }}
                />
            </div>
        </div>
    );
}
