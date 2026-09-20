'use client';

import type { Id } from '@/convex/_generated/dataModel';
import { requiredRouteParam } from '@/features/lib/route-param';

import type { SavedObjectiveForm } from '@/features/objectives/schemas/objective';
import { savedObjectiveSchema } from '@/features/objectives/schemas/objective';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/forms/form-modal';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { toCategoryId } from '@/features/objectives/lib/objective-category-selection';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
type EditObjectiveFormModalProps = {
    defaultValues: ObjectiveWithCapabilities;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};
export default function EditObjectiveFormModal({
    defaultValues,
    open,
    onOpenChange,
}: EditObjectiveFormModalProps) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const initialValues = {
        _id: defaultValues._id,
        title: defaultValues.title,
        description: defaultValues.description,
        categoryId: defaultValues.categoryId ?? null,
        targetValue: defaultValues.targetValue,
        startValue: defaultValues.startValue,
        deadline: defaultValues.deadline,
        unit: defaultValues.unit,
    };
    const updateObjective = useConvexMutation(api.objectives.updateObjective);
    const updateObjectiveMutation = useMutation({
        mutationFn: async (args: Parameters<typeof updateObjective>[0]) =>
            await updateObjective(args),
    });
    const { categoriesQuery, categoryOptions } = useObjectiveCategoryOptions();
    return (
        <FormModal<SavedObjectiveForm>
            open={open}
            onOpenChange={onOpenChange}
            title={t('editObjective')}
            description={t('editObjectiveDescription')}
            formOptions={{
                defaultValues: initialValues,
                validators: {
                    onChange: savedObjectiveSchema,
                    onSubmit: savedObjectiveSchema,
                },
            }}
            onSubmit={async (value: SavedObjectiveForm) => {
                await updateObjectiveMutation.mutateAsync({
                    id: requiredRouteParam(value._id) as Id<'objectives'>,
                    title: value.title,
                    description: value.description ?? undefined,
                    categoryId: toCategoryId(value.categoryId) ?? null,
                    targetValue: value.targetValue,
                    deadline: value.deadline,
                    unit: value.unit ?? undefined,
                });
            }}
            submitLabel={t('saveObjective')}
            cancelLabel={t('cancel')}
            isPending={updateObjectiveMutation.isPending}
            pendingLabel={tCommon('loading')}
            submitTestId="objective-edit-save-button"
        >
            {form => (
                <ObjectiveFormFields
                    form={form}
                    mode="edit"
                    categoryOptions={categoryOptions}
                    categoriesLoading={categoriesQuery.isLoading}
                />
            )}
        </FormModal>
    );
}
