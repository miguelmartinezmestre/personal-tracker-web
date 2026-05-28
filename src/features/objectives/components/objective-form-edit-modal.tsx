'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Objective,
    SavedObjectiveForm,
    savedObjectiveFormSchema,
} from '@/features/objectives/schemas/objective';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/forms/form-modal';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import {
    buildUpdateObjectivePayload,
    getObjectiveEditFormValues,
} from '@/features/objectives/lib/objective-form-payloads';
import { invalidateObjectiveMutationQueries } from '@/features/objectives/lib/objective-query-invalidation';

export default function EditObjectiveFormModal({ defaultValues }: { defaultValues: Objective }) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const initialValues = getObjectiveEditFormValues(defaultValues);
    const updateObjective = useConvexMutation(api.objectives.updateObjective);

    const updateObjectiveMutation = useMutation({
        mutationFn: async (args: ReturnType<typeof buildUpdateObjectivePayload>) =>
            await updateObjective(args),
        onSuccess: (_updatedObjective, variables) => {
            return invalidateObjectiveMutationQueries(queryClient, variables.id);
        },
    });

    const { categoriesQuery, categoryOptions, getCategoryNameForSelection } =
        useObjectiveCategoryOptions({
            selectedCategoryId: initialValues.categoryId,
            fallbackCategoryName: defaultValues.category,
        });

    return (
        <FormModal<SavedObjectiveForm>
            trigger={
                <Button className="gap-2" data-testid="objective-edit-open">
                    <Pencil className="h-4 w-4" />
                    {t('editObjective')}
                </Button>
            }
            title={t('editObjective')}
            description={t('editObjectiveDescription')}
            formOptions={{
                defaultValues: initialValues,
                validators: {
                    onChange: savedObjectiveFormSchema,
                    onSubmit: savedObjectiveFormSchema,
                },
            }}
            onSubmit={async (value: SavedObjectiveForm) => {
                await updateObjectiveMutation.mutateAsync(
                    buildUpdateObjectivePayload(value, getCategoryNameForSelection)
                );
            }}
            submitLabel={t('saveObjective')}
            cancelLabel={t('cancel')}
            isPending={updateObjectiveMutation.isPending}
            pendingLabel={tCommon('loading')}
            submitTestId="objective-edit-save-button"
        >
            {() => (
                <ObjectiveFormFields
                    mode="edit"
                    categoryOptions={categoryOptions}
                    categoriesLoading={categoriesQuery.isLoading}
                />
            )}
        </FormModal>
    );
}
