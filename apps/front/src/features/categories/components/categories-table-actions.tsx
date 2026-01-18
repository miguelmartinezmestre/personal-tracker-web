'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useDeleteCategory() {
    const t = useTranslations('Objectives.categories');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.categories.deleteCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
            toast.success(t('toast.deleteSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return { deleteCategory: mutate, deleteCategoryAsync: mutateAsync, isDeletingCategory: isPending };
}
