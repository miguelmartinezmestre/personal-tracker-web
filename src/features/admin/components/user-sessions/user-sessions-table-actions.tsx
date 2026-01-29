import { authClient } from "@/features/auth/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function useRevokeSession() {

    const t = useTranslations('Admin');
    const queryClient = useQueryClient();

    const { mutate: revokeSession, isPending: isRevokingSession } = useMutation({
        mutationFn: async ({ sessionToken }: { sessionToken: string }) => {
            return await authClient.admin.revokeUserSession({ sessionToken });
        },
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

