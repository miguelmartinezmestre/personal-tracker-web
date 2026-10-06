'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormModal from '@/components/forms/form-modal';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import {
    dateInputToUtcTimestamp,
    timestampToDateInput,
    todayDateInput,
} from '@/features/objectives/lib/dates';
import { formatObjectiveValue } from '@/features/objectives/lib/format';
import { useProgress, type ProgressEntry } from '@/features/objectives/hooks/use-progress';
import {
    progressFormSchema,
    type ProgressFormValues,
} from '@/features/objectives/schemas/objective';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';

export default function ProgressList({ objectiveId }: { objectiveId: string }) {
    const t = useTranslations('UpdateProgress');
    const common = useTranslations('Common');
    const locale = useLocale();
    const progress = useProgress(objectiveId);
    const deleteProgress = useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: useConvexMutation(api.objectives.deleteProgress),
    });
    let emptyState = null;
    if (!progress.isLoading && progress.data.length === 0) {
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
            <ul className="divide-y rounded-md border">
                {progress.data.map(entry => {
                    let editActions = null;
                    if (entry.canEdit) {
                        editActions = (
                            <div className="flex gap-2">
                                <EditProgressModal entry={entry} />
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
                            <div>
                                <p className="font-medium" data-testid="progress-entry-value">
                                    +{formatObjectiveValue(entry.updatedValue, locale)}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {timestampToDateInput(entry.updateDate)}
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

function EditProgressModal({ entry }: { entry: ProgressEntry }) {
    const t = useTranslations('UpdateProgress');
    const tCommon = useTranslations('Common');
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
                <Button variant="outline" size="sm" data-testid="progress-edit-open">
                    {t('table.columns.edit')}
                </Button>
            }
            title={t('editProgress')}
            description={t('editProgressDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: progressFormSchema,
                    onSubmit: progressFormSchema,
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
                <FieldGroup>
                    <form.Field name="updatedValue">
                        {field => {
                            let errors = [];
                            if (form.state.submissionAttempts > 0) {
                                errors = field.state.meta.errors;
                            } else {
                                errors = [];
                            }
                            let value: number | '' = '';
                            if (
                                typeof field.state.value === 'number' &&
                                Number.isFinite(field.state.value)
                            ) {
                                value = field.state.value;
                            } else {
                                value = '';
                            }
                            const handleChange = (rawValue: string) => {
                                let nextValue: number;
                                if (rawValue === '') {
                                    nextValue = Number.NaN;
                                } else {
                                    nextValue = Number(rawValue);
                                }
                                field.handleChange(nextValue);
                            };
                            return (
                                <Field>
                                    <FieldLabel htmlFor={`edit-${field.name}`}>
                                        {t('updatedValue')}
                                    </FieldLabel>
                                    <Input
                                        id={`edit-${field.name}`}
                                        type="number"
                                        step="any"
                                        min={0}
                                        value={value}
                                        onBlur={field.handleBlur}
                                        onChange={event => handleChange(event.target.value)}
                                        data-testid="progress-edit-value-input"
                                    />
                                    {errors.length > 0 ? <FieldError errors={errors} /> : null}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="updateDate">
                        {field => {
                            let errors = [];
                            if (form.state.submissionAttempts > 0) {
                                errors = field.state.meta.errors;
                            } else {
                                errors = [];
                            }
                            let value: string;
                            if (typeof field.state.value === 'string') {
                                value = field.state.value;
                            } else {
                                value = '';
                            }
                            return (
                                <Field>
                                    <FieldLabel htmlFor={`edit-${field.name}`}>
                                        {t('table.columns.date')}
                                    </FieldLabel>
                                    <Input
                                        id={`edit-${field.name}`}
                                        type="date"
                                        max={todayDateInput()}
                                        value={value}
                                        onBlur={field.handleBlur}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                    {errors.length > 0 ? <FieldError errors={errors} /> : null}
                                </Field>
                            );
                        }}
                    </form.Field>
                    <form.Field name="comment">
                        {field => {
                            let value: string;
                            if (typeof field.state.value === 'string') {
                                value = field.state.value;
                            } else {
                                value = '';
                            }
                            return (
                                <Field>
                                    <FieldLabel htmlFor={`edit-${field.name}`}>
                                        {t('comment')}
                                    </FieldLabel>
                                    <Textarea
                                        id={`edit-${field.name}`}
                                        value={value}
                                        onBlur={field.handleBlur}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                </Field>
                            );
                        }}
                    </form.Field>
                </FieldGroup>
            )}
        </FormModal>
    );
}
