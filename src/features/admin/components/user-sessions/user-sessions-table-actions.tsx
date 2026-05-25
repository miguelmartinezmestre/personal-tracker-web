'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authClient } from '@/features/auth/client';
import type { Id } from '@/convex/_generated/dataModel';
import { invalidateConvexQueryWhere } from '@/platform/convex/query-keys';

const userSessionsQuery = (userId: Id<'user'>) =>
    convexQuery(api.admin.listUserSessions, {
        userId,
        paginationOpts: { numItems: 10, cursor: null },
    });

type RevokeSessionVariables = {
    userId: Id<'user'>;
    sessionId: Id<'session'>;
};

type RevokeAllSessionsVariables = {
    userId: string;
};

export function useRevokeSession() {
    const t = useTranslations('Admin');
    const queryClient = useQueryClient();
    const revokeUserSession = useConvexMutation(api.admin.revokeUserSession);

    const { mutate: revokeSession, isPending: isRevokingSession } = useMutation({
        mutationFn: (variables: RevokeSessionVariables) => revokeUserSession(variables),
        onSuccess: (_data, variables) => {
            toast.success(t('userSessions.toast.revokeSuccess'));
            invalidateConvexQueryWhere(
                queryClient,
                userSessionsQuery(variables.userId),
                args => args.userId === variables.userId
            );
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
        mutationFn: async ({ userId }: RevokeAllSessionsVariables) => {
            if (!confirm(t('userSessions.confirm.revokeAll'))) {
                return;
            }
            return await authClient.admin.revokeUserSessions({ userId });
        },
        onSuccess: (_data, variables) => {
            toast.success(t('userSessions.toast.revokeAllSuccess'));
            invalidateConvexQueryWhere(
                queryClient,
                userSessionsQuery(variables.userId as Id<'user'>),
                args => args.userId === variables.userId
            );
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeAllFailed', { message: error.message }));
        },
    });
    return { revokeAllSessions, isRevokingAllSessions };
}
