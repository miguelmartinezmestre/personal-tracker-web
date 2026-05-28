'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { invalidateConvexQuery } from '@/platform/convex/query-keys';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

const CATEGORIES_QUERY = convexQuery(api.categories.getCategoriesByUser, {
    paginationOpts: DEFAULT_PAGINATION_OPTS,
});

export function useDeleteCategory() {
    const t = useTranslations('Objectives.categories');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.categories.deleteCategory),
        onSuccess: () => {
            invalidateConvexQuery(queryClient, CATEGORIES_QUERY);
            toast.success(t('toast.deleteSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return {
        deleteCategory: mutate,
        deleteCategoryAsync: mutateAsync,
        isDeletingCategory: isPending,
    };
}
