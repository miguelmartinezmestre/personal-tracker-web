'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation, convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useInvalidateSession() {
    const t = useTranslations('Sessions');
    const queryClient = useQueryClient();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.sessions.invalidateSession),
        onSuccess: () => {
            toast.success(t('sessionRevoked'));
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.sessions.getSessionsByUser, {
                    paginationOpts: { numItems: 20, cursor: null },
                }).queryKey,
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('sessionRevokeFailed'));
        },
    });

    return { invalidateSession: mutate, invalidateSessionAsync: mutateAsync, isInvalidatingSession: isPending };
}
