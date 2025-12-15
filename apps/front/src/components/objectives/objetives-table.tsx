'use client';

import { DataTable } from '@/components/table';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Objective } from '@/schemas/objective';
import { Button } from '@repo/ui/components/button';
import { CircularProgress } from '@repo/ui/components/circular-progress';
import { StatusIndicator } from '@repo/ui/components/status-indicator';
import Link from 'next/link';
import EditObjectiveFormModal from '@/components/objectives/objective-form-edit-modal';
import { QuickActions } from '@/components/objectives/quick-actions';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { Id } from '@repo/backend/convex/_generated/dataModel';

interface ObjetivesTableProps {
    objectives?: any[];
    isLoading?: boolean;
}

export default function ObjetivesTable({
    objectives: propObjectives,
    isLoading: propIsLoading,
}: ObjetivesTableProps) {
    const t = useTranslations('Objectives');
    const { data: fetchedObjectives, isLoading: fetchedIsLoading } = useQuery(
        convexQuery(api.objectives.getObjectivesByUser, {})
    );
    const deleteObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });

    // Use passed objectives if provided, otherwise use fetched data
    const objectives = propObjectives ?? fetchedObjectives ?? [];
    const isLoading = propIsLoading ?? fetchedIsLoading;

    const columns: ColumnDef<Objective>[] = [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            accessorKey: 'description',
            header: t('tableDescription'),
        },
        {
            id: 'progress',
            header: t('progress'),
            cell: ({ row }) => {
                const objective = row.original;
                return (
                    <div className="flex items-center space-x-2">
                        <CircularProgress
                            value={objective.currentValue}
                            max={objective.targetValue}
                            size="sm"
                        />
                        <span className="text-sm text-muted-foreground">
                            {objective.currentValue}/{objective.targetValue} {objective.unit || ''}
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
            id: 'status',
            header: t('status'),
            cell: ({ row }) => {
                const objective = row.original;
                return (
                    <StatusIndicator
                        status={objective.status}
                        deadline={objective.deadline}
                        currentValue={objective.currentValue}
                        targetValue={objective.targetValue}
                    />
                );
            },
        },
        {
            header: t('quickActions'),
            id: 'quick-actions',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <QuickActions
                        objectiveId={objetiveRow._id as Id<'objectives'>}
                        currentStatus={objetiveRow.status}
                    />
                );
            },
        },
        {
            header: '',
            id: 'update-objective',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return <EditObjectiveFormModal defaultValues={objetiveRow} />;
            },
        },
        {
            header: '',
            id: 'delete',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={async () => {
                            await deleteObjective.mutateAsync({
                                id: objetiveRow._id as Id<'objectives'>,
                            });
                        }}
                        data-testid="objective-delete-button"
                        variant="destructive"
                        size="sm"
                    >
                        {t('deleteObjective')}
                    </Button>
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
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
            <DataTable columns={columns} data={objectives ?? []} isLoading={isLoading} />
        </div>
    );
}
