import { authClient } from '@/features/auth/auth-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useBanUser() {
  const t = useTranslations('Admin');
  const queryClient = useQueryClient();

  const { mutate: banUser, isPending: isBanningUser } = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return await authClient.admin.banUser({
        userId,
        banReason: reason || t('usersTable.defaults.banReason'),
      });
    },
    onSuccess: () => {
      toast.success(t('usersTable.toast.bannedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(t('usersTable.toast.banFailed', { message: error.message }));
    },
  });
  return { banUser, isBanningUser };
}

export function useUnBanUser() {
  const t = useTranslations('Admin');
  const queryClient = useQueryClient();

  const { mutate: unbanUser, isPending: isUnbanningUser } = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return await authClient.admin.unbanUser({ userId });
    },
    onSuccess: () => {
      toast.success(t('usersTable.toast.unbannedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(t('usersTable.toast.unbanFailed', { message: error.message }));
    },
  });
  return { unbanUser, isUnbanningUser };
}

export function useDeleteUser() {
  const t = useTranslations('Admin');
  const queryClient = useQueryClient();

  const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return await authClient.admin.removeUser({ userId });
    },
    onSuccess: () => {
      toast.success(t('usersTable.toast.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(t('usersTable.toast.deleteFailed', { message: error.message }));
    },
  });
  return { deleteUser, isDeletingUser };
}
