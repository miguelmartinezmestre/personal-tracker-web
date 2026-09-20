'use client';

import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useDeleteCategory() {
    const t = useTranslations('Objectives.categories');

    const { mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.categories.deleteCategory),
        onSuccess: () => {
            toast.success(t('toast.deleteSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return {
        deleteCategoryAsync: mutateAsync,
        isDeletingCategory: isPending,
    };
}
