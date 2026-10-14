'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import FormModal from '@/components/forms/form-modal';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
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

export default function ProgressList({
    objectiveId,
    unit,
}: {
    objectiveId: string;
    unit?: string | undefined;
}) {
    const t = useTranslations('UpdateProgress');
    const common = useTranslations('Common');
    const locale = useLocale();
    const progress = useProgress(objectiveId);
    const deleteProgress = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteProgress),
    });
    let emptyState = null;
    if (progress.isLoading) {
        emptyState = (
            <div className="space-y-2" data-testid="progress-list-loading">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
        );
    } else if (progress.data.length === 0) {
        emptyState = <p className="text-muted-foreground text-sm">{t('empty')}</p>;
    }
    let loadMoreButton = null;
    if (progress.hasMore) {
        loadMoreButton = (
            <Button variant="outline" disabled={progress.isFetching} onClick={progress.loadMore}>
                {common('actions.loadMore')}
            </Button>
        );
    }

    return (
        <div className="space-y-3" data-testid="progress-list">
            {emptyState}
            <ul className="divide-y rounded-md border empty:hidden">
                {progress.data.map(entry => {
                    // Every row has the same buttons, so screen readers need to know which entry.
                    const entryLabel = `+${formatObjectiveValue(entry.updatedValue, locale)}${
                        unit ? ` ${unit}` : ''
                    } · ${formatObjectiveDate(entry.updateDate, locale)}`;
                    let editActions = null;
                    if (entry.canEdit) {
                        editActions = (
                            <div className="flex gap-2">
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
                                            aria-label={t('aria.deleteEntry', {
                                                entry: entryLabel,
                                            })}
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
                    }
                    return (
                        <li
                            key={entry.id}
                            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="font-medium" data-testid="progress-entry-value">
                                    +{formatObjectiveValue(entry.updatedValue, locale)}
                                    {unit ? ` ${unit}` : ''}
                                </p>
                                <p className="text-muted-foreground text-sm whitespace-pre-line wrap-anywhere">
                                    {formatObjectiveDate(entry.updateDate, locale)}
                                    {entry.comment ? ` · ${entry.comment}` : ''}
                                </p>
                            </div>
                            {editActions}
                        </li>
                    );
                })}
            </ul>
            {loadMoreButton}
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
