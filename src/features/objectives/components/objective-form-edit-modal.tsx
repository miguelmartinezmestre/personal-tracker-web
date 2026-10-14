'use client';

import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/forms/form-modal';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp, timestampToDateInput } from '@/features/objectives/lib/dates';
import { type ObjectiveSummary } from '@/features/objectives/hooks/use-objectives';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveFormSchema } from '@/features/objectives/hooks/use-form-schemas';
import { NONE_CATEGORY, type ObjectiveFormValues } from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

export default function EditObjectiveFormModal({
    objective,
    compactTrigger = false,
}: {
    objective: ObjectiveSummary;
    // Icon-only trigger on small screens, for table rows.
    compactTrigger?: boolean;
}) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const updateObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
    });
    const defaultValues: ObjectiveFormValues = {
        title: objective.title,
        description: objective.description ?? '',
        categoryId: objective.categoryId ?? NONE_CATEGORY,
        unit: objective.unit ?? '',
        startValue: objective.startValue,
        targetValue: objective.targetValue,
        deadline: timestampToDateInput(objective.deadline),
    };
    const formSchema = useObjectiveFormSchema(defaultValues.deadline);

    return (
        <FormModal<ObjectiveFormValues>
            trigger={
                compactTrigger ? (
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('editObjective')}
                        data-testid="objective-edit-open"
                    >
                        <Pencil className="sm:hidden" aria-hidden />
                        <span className="hidden sm:inline">{t('editObjective')}</span>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" data-testid="objective-edit-open">
                        {t('editObjective')}
                    </Button>
                )
            }
            title={t('editObjective')}
            description={t('editObjectiveDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: formSchema,
                    onSubmit: formSchema,
                },
            }}
            onSubmit={async values => {
                let deadline: number | undefined;
                if (values.deadline) {
                    deadline = dateInputToUtcTimestamp(values.deadline);
                } else {
                    deadline = undefined;
                }
                let categoryId: Id<'categories'> | null;
                if (values.categoryId === NONE_CATEGORY) {
                    categoryId = null;
                } else {
                    categoryId = values.categoryId as Id<'categories'>;
                }
                const updated = await updateObjective.mutateAsync({
                    id: objective.id,
                    title: values.title,
                    description: values.description.trim() || null,
                    unit: values.unit.trim() || null,
                    categoryId,
                    deadline: deadline ?? null,
                    startValue: values.startValue,
                    targetValue: values.targetValue,
                });
                if (updated.status === objective.status) {
                    toast.success(t('toast.updated'));
                } else if (updated.status === 'completed') {
                    toast.success(t('toast.completed'));
                } else {
                    toast.info(t('toast.reopened'));
                }
            }}
            submitLabel={t('saveObjective')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={updateObjective.isPending}
            cancelTestId="objective-edit-cancel-button"
            submitTestId="objective-edit-save-button"
        >
            {form => (
                <ObjectiveFormFields
                    form={form}
                    keptDeadline={defaultValues.deadline}
                    currentCategory={
                        objective.categoryId && objective.categoryName
                            ? { id: objective.categoryId, name: objective.categoryName }
                            : undefined
                    }
                />
            )}
        </FormModal>
    );
}
