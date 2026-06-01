'use client';

import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

export function useInvalidateSession() {
    const t = useTranslations('Sessions');

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: useConvexMutation(api.sessions.invalidateSession),
        onSuccess: () => {
            toast.success(t('sessionRevoked'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('sessionRevokeFailed'));
        },
    });

    return {
        invalidateSession: mutate,
        invalidateSessionAsync: mutateAsync,
        isInvalidatingSession: isPending,
    };
}

export function useInvalidateAllOtherSessions() {
    const t = useTranslations('Sessions');

    const { mutate, mutateAsync, isPending } = useMutation<
        { readonly success: boolean; readonly revokedCount: number },
        Error,
        { currentSessionId: Id<'session'> }
    >({
        mutationFn: useConvexMutation(api.sessions.invalidateAllOtherSessions),
        onSuccess: result => {
            toast.success(
                t('allOtherSessionsRevoked', {
                    count: result.revokedCount,
                })
            );
        },
        onError: (error: Error) => {
            toast.error(error.message || t('allOtherSessionsRevokeFailed'));
        },
    });

    return {
        invalidateAllOtherSessions: mutate,
        invalidateAllOtherSessionsAsync: mutateAsync,
        isInvalidatingAllOtherSessions: isPending,
    };
}
