'use client';

import { authClient } from '@/features/auth/auth-client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useDeleteAccount() {
  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      await authClient.deleteUser({
        password: password,
      });
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });
  return deleteAccountMutation;
}
