'use client';

import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useDeleteUpdateProgress() {
    const t = useTranslations('UpdateProgress');

    const { mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress),
        onSuccess: () => {
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return {
        deleteUpdateProgressAsync: mutateAsync,
        isDeletingProgress: isPending,
    };
}
