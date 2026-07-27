import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useConvexMutation } from '@convex-dev/react-query';
import { authClient } from '@/features/auth/client';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';

export function useBanUser() {
    const t = useTranslations('Admin');
    const banUserMutation = useConvexMutation(api.admin.banUser);

    const { mutate: banUser, isPending: isBanningUser } = useMutation({
        mutationFn: async ({ userId, reason }: { userId: Id<'user'>; reason?: string }) => {
            return await banUserMutation({
                userId,
                banReason: reason || t('usersTable.defaults.banReason'),
            });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.bannedSuccess'));
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.banFailed', { message: error.message }));
        },
    });
    return { banUser, isBanningUser };
}

export function useUnBanUser() {
    const t = useTranslations('Admin');

    const { mutate: unbanUser, isPending: isUnbanningUser } = useMutation({
        mutationFn: async ({ userId }: { userId: Id<'user'> }) => {
            const result = await authClient.admin.unbanUser({ userId });
            throwIfAuthClientError(result);
            return result.data;
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.unbannedSuccess'));
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.unbanFailed', { message: error.message }));
        },
    });
    return { unbanUser, isUnbanningUser };
}

export function useDeleteUser() {
    const t = useTranslations('Admin');
    const deleteUserMutation = useConvexMutation(api.admin.deleteUser);

    const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
        mutationFn: async ({ userId }: { userId: Id<'user'> }) => {
            return await deleteUserMutation({ userId });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.deletedSuccess'));
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.deleteFailed', { message: error.message }));
        },
    });
    return { deleteUser, isDeletingUser };
}
