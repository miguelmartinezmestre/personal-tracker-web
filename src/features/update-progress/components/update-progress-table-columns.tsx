'use client';

import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import UpdateProgressFormModal from '@/features/update-progress/components/update-progress-form-edit-modal';
import { UpdateProgress } from '@/features/update-progress/schemas/update-progress';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useDeleteUpdateProgress } from './update-progress-table-actions';

interface UseUpdateProgressTableColumnsProps {
    objectiveId: Id<'objectives'>;
}

export function useUpdateProgressTableColumns({ objectiveId }: UseUpdateProgressTableColumnsProps) {
    const t = useTranslations('UpdateProgress');
    const { deleteUpdateProgressAsync, isDeletingProgress } = useDeleteUpdateProgress(objectiveId);

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
                );
            },
        },
    ];

    return columns;
}
