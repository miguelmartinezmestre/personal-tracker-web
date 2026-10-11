'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { isOverdue } from '@/features/objectives/lib/dates';
import { formatObjectiveDate } from '@/features/objectives/lib/format';
import { api } from '@/convex/_generated/api';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { useObjectives, type ObjectiveSummary } from '@/features/objectives/hooks/use-objectives';
import {
    objectiveDetailHref,
    type ObjectiveStatusFilter,
} from '@/features/objectives/lib/status-filter';
import { useLocale, useTranslations } from 'next-intl';

// On phones the filters already say the status and the deadline is on the detail page, which
// leaves room for the actions.
const MOBILE_HIDDEN_COLUMNS = {
    status: 'hidden sm:table-cell',
    deadline: 'hidden md:table-cell',
};

export default function ObjectivesTable({ status }: { status: ObjectiveStatusFilter }) {
    const t = useTranslations('Objectives');
    const common = useTranslations('Common');
    const locale = useLocale();
    const objectives = useObjectives(status);
    const deleteObjective = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });
    const columns: ColumnDef<DataTableFeatures, ObjectiveSummary>[] = [
        {
            accessorKey: 'title',
            header: t('columns.title'),
            cell: ({ row }) => (
                <Link
                    href={objectiveDetailHref(row.original.id, status)}
                    prefetch={false}
                    className="block max-w-xs min-w-40 font-medium whitespace-normal underline-offset-4 wrap-anywhere hover:underline"
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
                <div className="flex flex-wrap gap-1">
                    <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'}>
                        {t(`statusOptions.${row.original.status}`)}
                    </Badge>
                    {isOverdue(row.original) ? (
                        <Badge variant="destructive">{t('statusOptions.overdue')}</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            accessorKey: 'progressPercent',
            header: t('progress'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="w-10 tabular-nums">{row.original.progressPercent}%</span>
                    <div
                        className="bg-muted hidden h-1.5 w-16 overflow-hidden rounded-full sm:block"
                        aria-hidden
                    >
                        <div
                            className="bg-primary h-full"
                            style={{ width: `${row.original.progressPercent}%` }}
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'deadline',
            header: t('deadline'),
            cell: ({ row }) =>
                row.original.deadline !== undefined
                    ? formatObjectiveDate(row.original.deadline, locale)
                    : '—',
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
                        <EditObjectiveFormModal objective={row.original} compactTrigger />
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
                                    aria-label={t('deleteObjective')}
                                    data-testid="objective-delete-button"
                                >
                                    <Trash2 className="sm:hidden" aria-hidden />
                                    <span className="hidden sm:inline">{t('deleteObjective')}</span>
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
            <DataTable
                columns={columns}
                columnClassNames={MOBILE_HIDDEN_COLUMNS}
                data={objectives.data}
                isLoading={objectives.isLoading}
                emptyMessage={
                    status === 'all' ? (
                        <div
                            className="flex flex-col items-center gap-3 py-6 whitespace-normal"
                            data-testid="objectives-empty"
                        >
                            <p className="font-medium">{t('empty.all')}</p>
                            <p className="text-muted-foreground">{t('empty.allHint')}</p>
                            <CreateObjectiveFormModal triggerTestId="objectives-empty-create" />
                        </div>
                    ) : (
                        t(`empty.${status}`)
                    )
                }
            />
            {loadMoreButton}
        </div>
    );
}
