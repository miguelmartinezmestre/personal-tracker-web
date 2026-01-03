'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { UpdateProgress } from '@/schemas/update-progress';
import { ObjectiveProgressGraph } from '@/components/objetive-graph';
import UpdateProgressFormModal from '@/components/update-progress/update-progress-form-edit-modal';
import { useParams } from 'next/navigation';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc, Id } from '@repo/backend/convex/_generated/dataModel';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';

export default function UpdateProgressTable() {
    const t = useTranslations('UpdateProgress');
    const params = useParams();
    const objectiveIdParam = params.id;
    const objectiveId = (
        Array.isArray(objectiveIdParam) ? objectiveIdParam[0] : objectiveIdParam
    ) as Id<'objectives'>;
    const updateProgress = useSuspenseQuery(
        convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
        })
    );
    const objective = useSuspenseQuery(
        convexQuery(api.objectives.getObjectiveById, { id: objectiveId })
    );
    const deleteUpdateProgress = useMutation({
        mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress),
        onSuccess: () => {
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    const getPeriodRange = (
        period: string | undefined,
        now: number,
        periodStart?: number,
        periodLengthDays?: number
    ) => {
        if (!period || period === 'none') return null;

        const date = new Date(now);
        switch (period) {
            case 'weekly': {
                const day = date.getDay();
                const diffToMonday = (day === 0 ? -6 : 1) - day;
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() + diffToMonday);
                const end = new Date(start);
                end.setDate(start.getDate() + 7);
                return { start: start.getTime(), end: end.getTime() };
            }
            case 'monthly': {
                const start = new Date(date.getFullYear(), date.getMonth(), 1);
                const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
                return { start: start.getTime(), end: end.getTime() };
            }
            case 'custom': {
                if (!periodStart || !periodLengthDays || periodLengthDays <= 0) return null;
                const lengthMs = periodLengthDays * 24 * 60 * 60 * 1000;
                if (now < periodStart) {
                    return { start: periodStart, end: periodStart + lengthMs };
                }
                const cycles = Math.floor((now - periodStart) / lengthMs);
                const start = periodStart + cycles * lengthMs;
                return { start, end: start + lengthMs };
            }
            default:
                return null;
        }
    };

    const columns: ColumnDef<Doc<'progressUpdates'>>[] = [
        {
            accessorKey: 'updatedValue',
            header: t('table.columns.currentValue'),
        },
        {
            accessorKey: 'updateDate',
            header: t('table.columns.date'),
            cell: ({ row }) => {
                const progressRow = row.original;
                return (
                    <span>
                        {new Date(progressRow.updateDate).toLocaleDateString()} -{' '}
                        {new Date(progressRow.updateDate).toLocaleTimeString()}
                    </span>
                );
            },
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
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            await deleteUpdateProgress.mutateAsync({
                                _id: progressRow._id as Id<'progressUpdates'>,
                            });
                        }}
                        title={t('confirm.deleteTitle')}
                        description={t('confirm.deleteDescription')}
                        triggerLabel={t('table.columns.delete')}
                        confirmLabel={t('confirm.deleteConfirm')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={deleteUpdateProgress.isPending}
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
                );
            },
        },
    ];

    const updates = updateProgress.data ?? [];
    const objectiveDoc = objective.data as
        | (Doc<'objectives'> & {
              objectiveType?: string;
              period?: string;
              periodStart?: number;
              periodLengthDays?: number;
          })
        | undefined;
    const objectiveType = objectiveDoc?.objectiveType ?? 'value';
    const period = objectiveDoc?.period ?? 'none';
    const isEventBased = objectiveType !== 'value' || (period && period !== 'none');
    const range = objectiveDoc
        ? getPeriodRange(
              period,
              Date.now(),
              objectiveDoc.periodStart,
              objectiveDoc.periodLengthDays
          )
        : null;
    const sortedUpdates = [...updates].sort((a, b) => a.updateDate - b.updateDate);
    const relevantUpdates = range
        ? sortedUpdates.filter(
              update => update.updateDate >= range.start && update.updateDate < range.end
          )
        : sortedUpdates;

    type ProgressPoint = { date: number; currentValue: number; objective: number };
    let runningTotal = 0;
    const progressData: ProgressPoint[] = relevantUpdates.map((item: Doc<'progressUpdates'>) => {
        const currentValue = isEventBased ? (runningTotal += item.updatedValue) : item.updatedValue;
        return {
            date: item.updateDate,
            currentValue,
            objective: objectiveDoc?.targetValue ?? 0,
        };
    });
    const lastUpdated =
        relevantUpdates.length > 0 ? relevantUpdates[relevantUpdates.length - 1].updateDate : null;

    // Prepare updates for velocity and streak calculations
    const updatesForGraph = relevantUpdates.map((item: Doc<'progressUpdates'>) => ({
        date: item.updateDate,
        value: item.updatedValue,
    }));

    return (
        <div className="space-y-4">
            {progressData.length > 0 && (
                <ObjectiveProgressGraph
                    data={progressData}
                    unit={objectiveDoc?.unit ?? null}
                    targetValue={objectiveDoc?.targetValue ?? null}
                    period={period}
                    periodRange={range}
                    lastUpdated={lastUpdated}
                    deadline={objectiveDoc?.deadline ?? null}
                    updates={updatesForGraph}
                />
            )}

            <DataTable
                columns={columns}
                data={updateProgress.data!}
                isLoading={updateProgress.isLoading}
            />
        </div>
    );
}
