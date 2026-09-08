'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreateObjective } from '@/features/objectives/schemas/objective';
import { objectiveSchema } from '@/features/objectives/schemas/objective';
import { OBJECTIVE_VISIBILITY } from '@/convex/utils/constants';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/forms/form-modal';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { toCategoryId } from '@/features/objectives/lib/objective-category-selection';

const defaultValues: CreateObjective = {
    title: '',
    description: '',
    categoryId: null,
    targetValue: 100,
    currentValue: 0,
    startValue: 0,
    deadline: null,
    status: 'active',
    unit: '',
    visibility: OBJECTIVE_VISIBILITY.PRIVATE,
};

export default function CreateObjectiveFormModal() {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const createObjective = useConvexMutation(api.objectives.createObjective);

    const createObjectiveMutation = useMutation({
        mutationFn: async (args: Parameters<typeof createObjective>[0]) =>
            await createObjective(args),
    });

    const { categoriesQuery, categoryOptions } = useObjectiveCategoryOptions();

    return (
        <FormModal<CreateObjective>
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
                    onChange: objectiveSchema,
                    onSubmit: objectiveSchema,
                },
            }}
            onSubmit={async (value: CreateObjective) => {
                await createObjectiveMutation.mutateAsync({
                    title: value.title,
                    description: value.description ?? undefined,
                    categoryId: toCategoryId(value.categoryId),
                    targetValue: value.targetValue,
                    startValue: value.startValue ?? 0,
                    deadline: value.deadline ?? undefined,
                    unit: value.unit ?? undefined,
                    visibility: value.visibility ?? 'private',
                });
            }}
            submitLabel={t('saveObjective')}
            cancelLabel={t('cancel')}
            isPending={createObjectiveMutation.isPending}
            pendingLabel={tCommon('loading')}
            cancelTestId="objective-cancel-button"
            submitTestId="objective-save-button"
        >
            {() => (
                <ObjectiveFormFields
                    mode="create"
                    categoryOptions={categoryOptions}
                    categoriesLoading={categoriesQuery.isLoading}
                />
            )}
        </FormModal>
    );
}
