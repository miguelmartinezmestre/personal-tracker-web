'use client';

import { authClient } from '@/features/auth/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/hooks/use-error-message';

export function useDeleteAccount() {
    const t = useTranslations('Settings');
    const getErrorMessage = useErrorMessage();

    const deleteAccountMutation = useMutation({
        mutationFn: async (password: string) => {
            const result = await authClient.softDeleteUser({ password });
            if (result.error) {
                throw new Error(result.error.message || t('deleteAccountFailed'));
            }
        },
        onSuccess: () => {
            toast.success(t('deleteAccountSuccess'));
        },
        onError: error => {
            toast.error(getErrorMessage(error, t('deleteAccountFailed')));
        },
    });
    return deleteAccountMutation;
}
