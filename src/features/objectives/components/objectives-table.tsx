'use client';

import { DataTableAdvanced } from '@/features/table/components/table';
import { ColumnDef } from '@tanstack/react-table';
import { Objective } from '@/features/objectives/schemas/objective';
import { Button } from '@/components/ui/button';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import Link from 'next/link';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { QuickActions } from '@/features/objectives/components/quick-actions';
import { useTranslations } from 'next-intl';
import { Id } from '@/convex/_generated/dataModel';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { normalizeObjective, OBJECTIVES_DEFAULT_PAGE_SIZE } from './objectives-utils';

interface ObjectivesTableProps {
    objectives?: Objective[];
    isLoading?: boolean;
}

export default function ObjectivesTable({
    objectives: propObjectives,
    isLoading: propIsLoading,
}: ObjectivesTableProps) {
    const t = useTranslations('Objectives');
    const tCard = useTranslations('ObjectiveCard');
    const queryClient = useQueryClient();

    const { data: fetchedObjectives, isLoading: fetchedIsLoading } = useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: {
                numItems: OBJECTIVES_DEFAULT_PAGE_SIZE,
                cursor: null,
            },
        }),
        select: data => data.page.map(normalizeObjective),
    });

    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            // Invalidate all objectives queries regardless of pagination
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    const getPeriodLabel = (period?: string | null) => {
        switch (period) {
            case 'weekly':
                return tCard('perWeek');
            case 'monthly':
                return tCard('perMonth');
            case 'custom':
                return tCard('perPeriod');
            default:
                return '';
        }
    };

    // Use passed objectives if provided, otherwise use fetched data
    const objectives = propObjectives ?? fetchedObjectives ?? [];
    const isLoading = propIsLoading ?? fetchedIsLoading;

    const actionMeta = {
        isAction: true,
        excludeFromExport: true,
        disableColumnOrder: true,
        disableColumnVisibility: true,
    };

    const columns: ColumnDef<Objective>[] = [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            id: 'description',
            accessorFn: objective => objective.description ?? '',
            header: t('tableDescription'),
        },
        {
            id: 'progress',
            accessorFn: objective =>
                objective.targetValue > 0 ? objective.currentValue / objective.targetValue : 0,
            header: t('progress'),
            cell: ({ row }) => {
                const objective = row.original;
                const periodLabel = getPeriodLabel(objective.period);
                const maxValue = objective.targetValue > 0 ? objective.targetValue : 100;
                return (
                    <div className="flex items-center space-x-2">
                        <CircularProgress value={objective.currentValue} max={maxValue} size="sm" />
                        <span className="text-sm text-muted-foreground">
                            {objective.currentValue}/{objective.targetValue} {objective.unit || ''}
                            {periodLabel ? ` (${periodLabel})` : ''}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'deadline',
            header: t('deadline'),
            cell: ({ row }) => {
                const objective = row.original;
                return objective.deadline ? new Date(objective.deadline).toLocaleDateString() : '';
            },
        },
        {
            accessorKey: 'status',
            header: t('status'),
            cell: ({ row }) => {
                const objective = row.original;
                return (
                    <StatusIndicator
                        status={objective.status ?? 'active'}
                        deadline={objective.deadline ?? undefined}
                        currentValue={objective.currentValue ?? 0}
                        targetValue={objective.targetValue ?? 0}
                    />
                );
            },
        },
        {
            header: t('quickActions'),
            id: 'quick-actions',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <QuickActions
                        objectiveId={objetiveRow._id as Id<'objectives'>}
                        currentStatus={objetiveRow.status ?? 'active'}
                    />
                );
            },
        },
        {
            header: '',
            id: 'update-objective',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return <EditObjectiveFormModal defaultValues={objetiveRow} />;
            },
        },
        {
            header: '',
            id: 'delete',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            await deleteObjectiveMutation.mutateAsync({
                                id: objetiveRow._id as Id<'objectives'>,
                            });
                        }}
                        title={t('confirm.deleteObjective')}
                        description={t('confirm.deleteObjectiveDescription')}
                        triggerLabel={t('deleteObjective')}
                        confirmLabel={t('confirm.deleteConfirm')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={deleteObjectiveMutation.isPending}
                        trigger={
                            <Button
                                data-testid="objective-delete-button"
                                variant="destructive"
                                size="sm"
                            >
                                {t('deleteObjective')}
                            </Button>
                        }
                    />
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                if (objetiveRow._id) {
                    return (
                        <Link
                            href={`/dashboard/objectives/${String(objetiveRow._id)}`}
                            prefetch={false}
                            data-testid="objective-progress-link"
                        >
                            {t('goToProgress')}
                        </Link>
                    );
                }

                return null;
            },
        },
    ];

    return (
        <div>
            <DataTableAdvanced
                columns={columns}
                data={objectives ?? []}
                isLoading={isLoading}
                enableGlobalSearch={false}
                enableColumnFilters={false}
                enableSorting={true}
            />
        </div>
    );
}
