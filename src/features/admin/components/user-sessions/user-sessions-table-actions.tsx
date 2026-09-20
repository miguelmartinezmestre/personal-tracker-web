'use client';

import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

type RevokeSessionVariables = {
    userId: Id<'user'>;
    sessionId: Id<'session'>;
};

type RevokeAllSessionsVariables = {
    userId: Id<'user'>;
};

export function useRevokeSession() {
    const t = useTranslations('Admin');
    const revokeUserSession = useConvexMutation(api.admin.revokeUserSession);

    const { mutate: revokeSession, isPending: isRevokingSession } = useMutation({
        mutationFn: (variables: RevokeSessionVariables) => revokeUserSession(variables),
        onSuccess: _data => {
            toast.success(t('userSessions.toast.revokeSuccess'));
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeFailed', { message: error.message }));
        },
    });
    return { revokeSession, isRevokingSession };
}

export function useConfirmRevokeAllSessions() {
    const t = useTranslations('Admin');
    const revoke = useConvexMutation(api.admin.revokeAllUserSessions);

    const { mutate: revokeAllSessions, isPending: isRevokingAllSessions } = useMutation({
        mutationFn: async ({ userId }: RevokeAllSessionsVariables): Promise<boolean> => {
            if (!confirm(t('userSessions.confirm.revokeAll'))) {
                return false;
            }
            await revoke({ userId });
            return true;
        },
        onSuccess: confirmed => {
            if (!confirmed) {
                return;
            }
            toast.success(t('userSessions.toast.revokeAllSuccess'));
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeAllFailed', { message: error.message }));
        },
    });
    return { revokeAllSessions, isRevokingAllSessions };
}
