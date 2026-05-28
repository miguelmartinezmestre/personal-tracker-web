'use client';

import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savedCategorySchema, Category } from '@/features/categories/schemas/category';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import FormModal from '@/components/forms/form-modal';
import { CategoryFormFields } from './category-form-fields';
import { invalidateConvexQuery } from '@/platform/convex/query-keys';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

const CATEGORIES_QUERY = convexQuery(api.categories.getCategoriesByUser, {
    paginationOpts: DEFAULT_PAGINATION_OPTS,
});

export default function EditCategoryFormModal({ defaultValues }: { defaultValues: Category }) {
    const t = useTranslations('Objectives.categories');
    const queryClient = useQueryClient();

    const updateCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.updateCategory),
        onSuccess: () => {
            invalidateConvexQuery(queryClient, CATEGORIES_QUERY);
        },
    });

    return (
        <FormModal<z.infer<typeof savedCategorySchema>>
            trigger={
                <Button className="gap-2" data-testid="category-edit-open">
                    <PlusCircle className="h-4 w-4" />
                    {t('buttons.update')}
                </Button>
            }
            title={t('editTitle')}
            contentClassName="sm:max-w-[500px]"
            formOptions={{
                defaultValues: {
                    id: defaultValues.id,
                    name: defaultValues.name,
                    color: defaultValues.color,
                    icon: defaultValues.icon,
                },
                validators: {
                    onChange: savedCategorySchema,
                    onSubmit: savedCategorySchema,
                },
            }}
            onSubmit={async (values: Category) => {
                await updateCategory.mutateAsync({
                    id: values.id,
                    name: values.name,
                    color: values.color,
                    icon: values.icon,
                });
            }}
            submitLabel={t('buttons.update')}
            cancelLabel={t('buttons.cancel')}
            pendingLabel={t('buttons.updating')}
            isPending={updateCategory.isPending}
            cancelTestId="category-edit-cancel-button"
            submitTestId="category-edit-save-button"
        >
            {() => <CategoryFormFields testIdPrefix="category-edit" />}
        </FormModal>
    );
}
