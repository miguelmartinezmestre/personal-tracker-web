'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import UpdateProgressFormModal from '@/features/update-progress/components/update-progress-form-edit-modal';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { mapDocToUpdateProgress } from '@/features/update-progress/lib/map-doc-to-update-progress';
import { useDeleteUpdateProgress } from './update-progress-table-actions';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';

interface UseUpdateProgressTableColumnsProps {
    objectiveId: Id<'objectives'>;
    objective: ObjectiveWithCapabilities | null;
    currentUserId: Id<'user'> | null;
}

export function useUpdateProgressTableColumns({
    objectiveId,
    objective,
    currentUserId,
}: UseUpdateProgressTableColumnsProps) {
    const t = useTranslations('UpdateProgress');
    const locale = useLocale();
    const { deleteUpdateProgressAsync, isDeletingProgress } = useDeleteUpdateProgress();

    const canEditProgressRow = (authorId: Id<'user'>) => {
        if (!objective || !currentUserId) {
            return false;
        }
        if (authorId === currentUserId) {
            return true;
        }
        return objective.capabilities.canEditDefinition;
    };

    const columns: ColumnDef<DataTableFeatures, Doc<'progressUpdates'>>[] = [
        {
            accessorKey: 'updatedValue',
            header: t('table.columns.currentValue'),
        },
        {
            accessorKey: 'updateDate',
            header: t('table.columns.date'),
            cell: ({ row }) => {
                const progressRow = row.original;
                return <span>{formatCivilDate(progressRow.updateDate, locale)}</span>;
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
                if (!canEditProgressRow(progressRow.createdBy)) {
                    return null;
                }
                return (
                    <UpdateProgressFormModal
                        defaultValues={mapDocToUpdateProgress(progressRow)}
                        objectiveId={objectiveId}
                    />
                );
            },
        },
        {
            header: t('table.columns.delete'),
            id: 'delete',
            cell: ({ row }) => {
                const progressRow = row.original;
                if (!canEditProgressRow(progressRow.createdBy)) {
                    return null;
                }
                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            await deleteUpdateProgressAsync({
                                _id: progressRow._id,
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
