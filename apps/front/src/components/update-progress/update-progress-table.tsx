'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { UpdateProgress } from '@/schemas/update-progress';
import ProgressChart from '@/components/progress-chart';
import UpdateProgressFormModal from '@/components/update-progress/update-progress-form-edit-modal';
import { useParams } from 'next/navigation';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc, Id } from '@repo/backend/convex/_generated/dataModel';
import { useTranslations } from 'next-intl';

export default function UpdateProgressTable() {
    const t = useTranslations('UpdateProgress');
    const { id: objectiveId } = useParams();
    const updateProgress = useSuspenseQuery(
        convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId: objectiveId as Id<'objectives'>,
        })
    );
    const objective = useSuspenseQuery(
        convexQuery(api.objectives.getObjectiveById, { id: objectiveId })
    );
    const deleteUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress),
    });

    const columns: ColumnDef<Doc<'progressUpdates'>>[] = [
        {
            accessorKey: 'updatedValue',
            header: t('table.columns.currentValue'),
        },
        {
            accessorKey: 'updateDate',
            header: t('table.columns.date'),
        },
        {
            accessorKey: 'comment',
            header: t('table.columns.comment'),
        },
        {
            header: t('table.columns.edit'),
            id: 'edit',
            cell: ({ row }) => {
                const progressRow = row.original;
                const defaultValues = {
                    _id: String(progressRow._id),
                    updatedValue: progressRow.updatedValue,
                    updateDate: new Date(progressRow.updateDate),
                    comment: progressRow.comment ?? null,
                } as unknown as UpdateProgress;
                return <UpdateProgressFormModal defaultValues={defaultValues} />;
            },
        },
        {
            header: t('table.columns.delete'),
            id: 'delete',
            cell: ({ row }) => {
                const progressRow = row.original;
                return (
                    <Button
                        data-testid="progress-delete-button"
                        onClick={async () => {
                            await deleteUpdateProgress.mutateAsync({
                                _id: progressRow._id as Id<'progressUpdates'>,
                            });
                        }}
                    >
                        {t('table.columns.delete')}
                    </Button>
                );
            },
        },
    ];

    type ProgressPoint = { date: string; currentValue: number; objective: number };
    const progressData: ProgressPoint[] = (updateProgress.data ?? []).map(
        (item: Doc<'progressUpdates'>) => ({
            date: new Date(item.updateDate).toISOString(),
            currentValue: item.updatedValue,
            objective: (objective.data as Doc<'objectives'> | undefined)?.targetValue ?? 0,
        })
    );

    return (
        <div>
            {progressData.length > 0 && (
                <div className="p-4 border rounded-lg bg-background">
                    <ProgressChart data={progressData} />
                </div>
            )}

            <DataTable
                columns={columns}
                data={updateProgress.data!}
                isLoading={updateProgress.isLoading}
            />
        </div>
    );
}
