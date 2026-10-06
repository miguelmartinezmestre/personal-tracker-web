'use client';

import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/forms/form-modal';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { dateInputToUtcTimestamp } from '@/features/objectives/lib/dates';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import {
    NONE_CATEGORY,
    objectiveFormSchema,
    type ObjectiveFormValues,
} from '@/features/objectives/schemas/objective';
import { useTranslations } from 'next-intl';

const defaultValues: ObjectiveFormValues = {
    title: '',
    description: '',
    categoryId: NONE_CATEGORY,
    unit: '',
    startValue: 0,
    targetValue: 1,
    deadline: '',
};

export default function CreateObjectiveFormModal() {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const createObjective = useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
    });

    return (
        <FormModal<ObjectiveFormValues>
            trigger={
                <Button className="gap-2" data-testid="objective-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('createObjective')}
                </Button>
            }
            title={t('createObjective')}
            description={t('createObjectiveDescription')}
            formOptions={{
                defaultValues,
                validators: {
                    onChange: objectiveFormSchema,
                    onSubmit: objectiveFormSchema,
                },
            }}
            onSubmit={async values => {
                const deadline = dateInputToUtcTimestamp(values.deadline);
                const description = values.description.trim();
                const unit = values.unit.trim();
                let category: { categoryId: Id<'categories'> } | Record<string, never>;
                if (values.categoryId !== NONE_CATEGORY) {
                    category = { categoryId: values.categoryId as Id<'categories'> };
                } else {
                    category = {};
                }
                await createObjective.mutateAsync({
                    title: values.title,
                    startValue: values.startValue,
                    targetValue: values.targetValue,
                    ...(description ? { description } : {}),
                    ...(unit ? { unit } : {}),
                    ...category,
                    ...(deadline !== undefined ? { deadline } : {}),
                });
                toast.success(t('toast.created'));
            }}
            submitLabel={t('saveObjective')}
            pendingLabel={tCommon('actions.saving')}
            cancelLabel={t('cancel')}
            isPending={createObjective.isPending}
            cancelTestId="objective-cancel-button"
            submitTestId="objective-save-button"
        >
            {form => <ObjectiveFormFields form={form} />}
        </FormModal>
    );
}
