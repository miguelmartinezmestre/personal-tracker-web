'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import type { ObjectiveSummary } from '@/features/objectives/hooks/use-objectives';
import { formatInstantDate, formatProgressPercent } from '@/features/objectives/lib/format';

export default function ObjectivesTrash() {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    const trash = usePaginatedList(api.trash.listTrash, {});

    const restore = useMutation({ mutationFn: useConvexMutation(api.trash.restoreObjective) });

    const purge = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.trash.purgeObjective),
    });

    const columns: ColumnDef<DataTableFeatures, ObjectiveSummary>[] = [
        {
            accessorKey: 'title',
            header: t('columns.title'),
            cell: ({ row }) => (
                <span className="block max-w-xs min-w-40 font-medium whitespace-normal wrap-anywhere">
                    {row.original.title}
                </span>
            ),
        },
        {
            id: 'progress',
            header: t('progress'),
            cell: ({ row }) => formatProgressPercent(row.original.progressPercent, locale),
        },
        {
            id: 'deletedAt',
            header: t('trash.deletedOn'),
            cell: ({ row }) =>
                row.original.deletedAt === undefined
                    ? null
                    : formatInstantDate(row.original.deletedAt, locale),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={restore.isPending}
                        onClick={() =>
                            restore.mutate(
                                { id: row.original.id },
                                { onSuccess: () => toast.success(t('trash.restored')) }
                            )
                        }
                        data-testid="trash-restore-button"
                    >
                        {t('trash.restore')}
                    </Button>
                    <DeleteConfirmationDialog
                        title={t('trash.purgeTitle')}
                        description={t('trash.purgeDescription')}
                        confirmLabel={t('trash.purge')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={purge.isPending}
                        trigger={
                            <Button
                                variant="destructive"
                                size="sm"
                                data-testid="trash-purge-button"
                            >
                                {t('trash.purge')}
                            </Button>
                        }
                        onConfirm={async () => {
                            try {
                                await purge.mutateAsync({ id: row.original.id });
                                toast.success(t('trash.purged'));
                            } catch {
                                toast.error(t('trash.purgeFailed'));
                            }
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="objectives-trash">
            <div className="space-y-2">
                <Link
                    href="/dashboard/objectives"
                    prefetch={false}
                    className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                >
                    {t('backToList')}
                </Link>
                <h1 className="text-2xl font-bold">{t('trash.title')}</h1>
                <p className="text-muted-foreground">{t('trash.description')}</p>
            </div>
            <DataTable
                columns={columns}
                data={trash.data}
                columnClassNames={{ progress: 'hidden sm:table-cell' }}
                isLoading={trash.isLoading}
                pagination={trash}
                emptyMessage={t('trash.empty')}
            />
        </div>
    );
}
