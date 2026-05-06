'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authClient } from '@/features/auth/auth-client';

export function useRevokeSession() {
    const t = useTranslations('Admin');
    const queryClient = useQueryClient();

    const { mutate: revokeSession, isPending: isRevokingSession } = useMutation({
        mutationFn: useConvexMutation(api.admin.revokeUserSession),
        onSuccess: () => {
            toast.success(t('userSessions.toast.revokeSuccess'));
            queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeFailed', { message: error.message }));
        },
    });
    return { revokeSession, isRevokingSession };
}

export function useConfirmRevokeAllSessions() {
    const t = useTranslations('Admin');
    const queryClient = useQueryClient();

    const { mutate: revokeAllSessions, isPending: isRevokingAllSessions } = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            if (!confirm(t('userSessions.confirm.revokeAll'))) {
                return;
            }
            return await authClient.admin.revokeUserSessions({ userId });
        },
        onSuccess: () => {
            toast.success(t('userSessions.toast.revokeAllSuccess'));
            queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeAllFailed', { message: error.message }));
        },
    });
    return { revokeAllSessions, isRevokingAllSessions };
}
