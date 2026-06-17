'use client';

import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Id } from '@/convex/_generated/dataModel';
import {
    Objective,
    SavedObjectiveForm,
    savedObjectiveSchema,
} from '@/features/objectives/schemas/objective';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import FormModal from '@/components/forms/form-modal';
import { ObjectiveFormFields } from '@/features/objectives/components/objective-form-fields';
import { useObjectiveCategoryOptions } from '@/features/objectives/hooks/use-objective-category-options';
import { toCategoryId } from '@/features/objectives/lib/objective-category-selection';

type EditObjectiveFormModalProps = {
    defaultValues: Objective;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: ReactNode;
};

export default function EditObjectiveFormModal({
    defaultValues,
    open,
    onOpenChange,
    trigger,
}: EditObjectiveFormModalProps) {
    const t = useTranslations('Objectives');
    const tCommon = useTranslations('Common');
    const initialValues = {
        _id: defaultValues._id,
        title: defaultValues.title,
        description: defaultValues.description,
        categoryId: defaultValues.categoryId ? String(defaultValues.categoryId) : null,
        targetValue: defaultValues.targetValue,
        currentValue: defaultValues.currentValue,
        startValue: defaultValues.startValue,
        deadline: defaultValues.deadline,
        status: defaultValues.status,
        unit: defaultValues.unit,
    };
    const updateObjective = useConvexMutation(api.objectives.updateObjective);

    const updateObjectiveMutation = useMutation({
        mutationFn: async (args: Parameters<typeof updateObjective>[0]) =>
            await updateObjective(args),
    });

    const { categoriesQuery, categoryOptions } = useObjectiveCategoryOptions();

    const defaultTrigger = (
        <Button className="gap-2" data-testid="objective-edit-open">
            <Pencil className="h-4 w-4" />
            {t('editObjective')}
        </Button>
    );

    return (
        <FormModal<SavedObjectiveForm>
            trigger={trigger ?? (open === undefined ? defaultTrigger : undefined)}
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
                    id: value._id as Id<'objectives'>,
                    title: value.title,
                    description: value.description ?? undefined,
                    categoryId: toCategoryId(value.categoryId) ?? null,
                    targetValue: value.targetValue,
                    deadline: value.deadline ?? undefined,
                    unit: value.unit ?? undefined,
                });
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
