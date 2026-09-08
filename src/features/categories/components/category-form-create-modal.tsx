'use client';

import type { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreateCategory } from '@/features/categories/schemas/category';
import { categorySchema } from '@/features/categories/schemas/category';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import FormModal from '@/components/forms/form-modal';
import { CategoryFormFields } from './category-form-fields';

const defaultValues: CreateCategory = {
    name: '',
    color: '#3b82f6',
    icon: undefined,
};

export default function CreateCategoryFormModal() {
    const t = useTranslations('Objectives.categories');

    const createCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.createCategory),
    });

    return (
        <FormModal<z.infer<typeof categorySchema>>
            trigger={
                <Button className="gap-2" data-testid="category-create-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.create')}
                </Button>
            }
            title={t('createTitle')}
            contentClassName="sm:max-w-[500px]"
            formOptions={{
                defaultValues,
                validators: {
                    onChange: categorySchema,
                    onSubmit: categorySchema,
                },
            }}
            onSubmit={async (values: CreateCategory) => {
                await createCategory.mutateAsync(values);
            }}
            submitLabel={t('buttons.create')}
            cancelLabel={t('buttons.cancel')}
            pendingLabel={t('buttons.creating')}
            isPending={createCategory.isPending}
            cancelTestId="category-cancel-button"
            submitTestId="category-save-button"
        >
            {() => <CategoryFormFields testIdPrefix="category" showColorDescription />}
        </FormModal>
    );
}
