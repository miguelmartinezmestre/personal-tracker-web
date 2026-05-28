'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { invalidateConvexQueryWhere } from '@/platform/convex/query-keys';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

export function useDeleteUpdateProgress(objectiveId: Id<'objectives'>) {
    const t = useTranslations('UpdateProgress');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress),
        onSuccess: () => {
            invalidateConvexQueryWhere(
                queryClient,
                convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
                    objectiveId,
                    paginationOpts: DEFAULT_PAGINATION_OPTS,
                }),
                queryArgs => queryArgs.objectiveId === objectiveId
            );
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    return {
        deleteUpdateProgress: mutate,
        deleteUpdateProgressAsync: mutateAsync,
        isDeletingProgress: isPending,
    };
}
