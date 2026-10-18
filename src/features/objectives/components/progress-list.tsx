'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/forms/form-modal';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { DataTable } from '@/components/data-table/components/table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import type { ColumnDef } from '@tanstack/react-table';
import { dateInputToUtcTimestamp, timestampToDateInput } from '@/features/objectives/lib/dates';
import { formatObjectiveDate, formatObjectiveValue } from '@/features/objectives/lib/format';
import { useProgress, type ProgressEntry } from '@/features/objectives/hooks/use-progress';
import { useProgressFormSchema } from '@/features/objectives/hooks/use-form-schemas';
import { ProgressFields } from '@/features/objectives/components/progress-fields';
import { type ProgressFormValues } from '@/features/objectives/schemas/objective';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function ProgressList({
    objectiveId,
    unit,
}: {
    objectiveId: Id<'objectives'>;
    unit?: string | undefined;
}) {
    const t = useTranslations('UpdateProgress');
    const locale = useLocale();
    const progress = useProgress(objectiveId);

    const deleteProgress = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteProgress),
    });

    const formatAmount = (entry: ProgressEntry) =>
        `+${formatObjectiveValue(entry.updatedValue, locale)}${unit ? ` ${unit}` : ''}`;

    const columns: ColumnDef<DataTableFeatures, ProgressEntry>[] = [
        {
            id: 'amount',
            header: t('table.columns.amount'),
            cell: ({ row }) => (
                <span className="font-medium" data-testid="progress-entry-value">
                    {formatAmount(row.original)}
                </span>
            ),
        },
        {
            id: 'date',
            header: t('table.columns.date'),
            cell: ({ row }) => (
                <>
                    {formatObjectiveDate(row.original.updateDate, locale)}
                    {/* The comment column is hidden on narrow screens, so show it here instead. */}
                    {row.original.comment ? (
                        <span className="text-muted-foreground block max-w-48 whitespace-normal wrap-anywhere sm:hidden">
                            {row.original.comment}
                        </span>
                    ) : null}
                </>
            ),
        },
        {
            id: 'comment',
            header: t('table.columns.comment'),
            cell: ({ row }) => (
                <span className="text-muted-foreground whitespace-pre-line wrap-anywhere">
                    {row.original.comment}
                </span>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('table.columns.edit')}</span>,
            cell: ({ row }) => {
                const entry = row.original;

                if (!entry.canEdit) {
                    return null;
                }

                // Every row has the same buttons, so screen readers need to know which entry.
                const entryLabel = `${formatAmount(entry)} · ${formatObjectiveDate(entry.updateDate, locale)}`;

                return (
                    <div className="flex justify-end gap-2">
                        <EditProgressModal
                            entry={entry}
                            unit={unit}
                            triggerLabel={t('aria.editEntry', { entry: entryLabel })}
                        />
                        <DeleteConfirmationDialog
                            title={t('confirm.deleteTitle')}
                            description={t('confirm.deleteDescription')}
                            confirmLabel={t('confirm.deleteConfirm')}
                            cancelLabel={t('confirm.cancel')}
                            isLoading={deleteProgress.isPending}
                            trigger={
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    aria-label={t('aria.deleteEntry', { entry: entryLabel })}
                                    data-testid="progress-delete-button"
                                >
                                    {t('table.columns.delete')}
                                </Button>
                            }
                            onConfirm={async () => {
                                try {
                                    await deleteProgress.mutateAsync({ id: entry.id });
                                    toast.success(t('toast.deletedSuccess'));
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

    return (
        <div data-testid="progress-list">
            <DataTable
                columns={columns}
                data={progress.data}
                columnClassNames={{ comment: 'hidden sm:table-cell' }}
                isLoading={progress.isLoading}
                pagination={progress}
                emptyMessage={t('empty')}
            />
        </div>
    );
}

function EditProgressModal({
    entry,
    unit,
    triggerLabel,
}: {
    entry: ProgressEntry;
    unit?: string | undefined;
    triggerLabel: string;
}) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
    const formSchema = useProgressFormSchema();

    const updateProgress = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateProgress),
    });

    const defaultValues: ProgressFormValues = {
        updatedValue: entry.updatedValue,
        updateDate: timestampToDateInput(entry.updateDate),
        comment: entry.comment ?? '',
    };

    return (
        <FormModal<ProgressFormValues>
            trigger={
                <Button
                    variant="outline"
                    size="sm"
                    aria-label={triggerLabel}
                    data-testid="progress-edit-open"
                >
                    {t('table.columns.edit')}
                </Button>
            }
            title={t('editProgress')}
            description={t('editProgressDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: formSchema,
                    onSubmit: formSchema,
                },
            }}
            onSubmit={async values => {
                const updateDate = dateInputToUtcTimestamp(values.updateDate);

                if (updateDate === undefined) {
                    return;
                }

                await updateProgress.mutateAsync({
                    id: entry.id,
                    updatedValue: values.updatedValue,
                    updateDate,
                    comment: values.comment.trim() || null,
                });
                toast.success(t('toast.updated'));
            }}
            submitLabel={t('saveProgress')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={updateProgress.isPending}
            submitTestId="progress-edit-save-button"
        >
            {form => (
                <ProgressFields
                    form={form}
                    idPrefix="edit-"
                    testIdPrefix="progress-edit"
                    valueLabel={unit ? t('entryValueWithUnit', { unit }) : t('entryValue')}
                    valueHint={t('entryValueDescription')}
                />
            )}
        </FormModal>
    );
}
