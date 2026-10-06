'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { timestampToDateInput } from '@/features/objectives/lib/dates';
import { api } from '@/convex/_generated/api';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import {
    useObjectives,
    type ObjectiveStatusFilter,
    type ObjectiveSummary,
} from '@/features/objectives/hooks/use-objectives';
import { useTranslations } from 'next-intl';

export default function ObjectivesTable({ status }: { status: ObjectiveStatusFilter }) {
    const t = useTranslations('Objectives');
    const common = useTranslations('Common');
    const objectives = useObjectives(status);
    const deleteObjective = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });
    const columns: ColumnDef<DataTableFeatures, ObjectiveSummary>[] = [
        {
            accessorKey: 'title',
            header: t('smartForm.fields.titleRequired'),
            cell: ({ row }) => (
                <Link
                    href={`/dashboard/objectives/${row.original.id}`}
                    prefetch={false}
                    className="font-medium underline-offset-4 hover:underline"
                    data-testid="objective-row-link"
                >
                    {row.original.title}
                </Link>
            ),
        },
        {
            accessorKey: 'status',
            header: t('status'),
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'}>
                    {t(`statusOptions.${row.original.status}`)}
                </Badge>
            ),
        },
        {
            accessorKey: 'progressPercent',
            header: t('progress'),
            cell: ({ row }) => `${row.original.progressPercent}%`,
        },
        {
            id: 'deadline',
            header: t('deadline'),
            cell: ({ row }) => timestampToDateInput(row.original.deadline) || '—',
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                if (!row.original.canManage) {
                    return null;
                }
                return (
                    <div className="flex justify-end gap-2">
                        <EditObjectiveFormModal objective={row.original} />
                        <DeleteConfirmationDialog
                            title={t('confirm.deleteObjective')}
                            description={t('confirm.deletePermanentDescription')}
                            confirmLabel={t('confirm.deleteConfirm')}
                            cancelLabel={t('confirm.cancel')}
                            isLoading={deleteObjective.isPending}
                            trigger={
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    data-testid="objective-delete-button"
                                >
                                    {t('deleteObjective')}
                                </Button>
                            }
                            onConfirm={async () => {
                                try {
                                    await deleteObjective.mutateAsync({ id: row.original.id });
                                    toast.success(t('toast.deleted'));
                                } catch {
                                    toast.error(t('toast.deleteFailed'));
                                }
                            }}
                        />
                    </div>
                );
            },
        },
    ];
    let emptyState = null;
    if (!objectives.isLoading && objectives.data.length === 0) {
        emptyState = (
            <p className="text-muted-foreground text-sm">{t('empty.noObjectivesFound')}</p>
        );
    }
    let loadMoreButton = null;
    if (objectives.hasMore) {
        loadMoreButton = (
            <Button
                variant="outline"
                className="mt-4"
                disabled={objectives.isFetching}
                onClick={objectives.loadMore}
                data-testid="objectives-load-more"
            >
                {common('actions.loadMore')}
            </Button>
        );
    }

    return (
        <div data-testid="objectives-table">
            <DataTable columns={columns} data={objectives.data} isLoading={objectives.isLoading} />
            {emptyState}
            {loadMoreButton}
        </div>
    );
}
