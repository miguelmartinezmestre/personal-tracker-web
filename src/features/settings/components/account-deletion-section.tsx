'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useDeleteAccount } from '@/features/settings/hooks/use-delete-account';
import { useSession } from '@/features/auth/hooks/use-session';
import { useRouter } from 'next/navigation';

export default function AccountDeletionSection() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const sessionQuery = useSession();
    const sessionUser = sessionQuery?.data?.user;
    const deleteAccount = useDeleteAccount();
    const router = useRouter();

    const [emailConfirmation, setEmailConfirmation] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const userEmail = sessionUser?.email ?? '';
    const isLoading = deleteAccount.isPending;
    const canDelete = emailConfirmation === userEmail && password.length > 0;

    const handleDelete = async () => {
        setError('');

        if (!canDelete) {
            return;
        }

        try {
            await deleteAccount.mutateAsync(password);
            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : tCommon('genericErrorDescription');
            setError(errorMessage);
        }
    };

    if (sessionQuery?.isPending) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (success) {
        return (
            <div
                className="rounded-lg border border-green-200 bg-green-50 p-6 text-center"
                data-testid="delete-account-success"
            >
                <p className="text-green-700">{t('deleteAccountSuccess')}</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="font-semibold text-red-900">{t('deleteAccountTitle')}</h3>
                        <p className="text-sm text-red-700 mt-1">{t('deleteAccountDescription')}</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmEmail" className="text-sm font-medium text-red-900">
                            {t('deleteAccountConfirmLabel')}
                        </label>
                        <Input
                            id="confirmEmail"
                            type="email"
                            placeholder={t('deleteAccountPlaceholder')}
                            value={emailConfirmation}
                            onChange={e => setEmailConfirmation(e.target.value)}
                            className="bg-white border-red-300"
                            data-testid="delete-account-email-input"
                        />
                        <p className="text-xs text-red-600">
                            {t('deleteAccountHelpText', { email: userEmail })}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-red-900">
                            {t('deleteAccountPasswordLabel')}
                        </label>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t('deleteAccountPasswordPlaceholder')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="bg-white border-red-300"
                            data-testid="delete-account-password-input"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600" data-testid="delete-account-error">
                            {error}
                        </p>
                    )}

                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading || !canDelete}
                        className="w-full sm:w-auto"
                        data-testid="delete-account-button"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('deleteAccountButton')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
