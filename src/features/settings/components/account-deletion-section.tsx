'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useDeleteAccount } from '@/features/settings/hooks/use-delete-account';
import { useSession } from '@/features/auth/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';

export default function AccountDeletionSection() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const sessionQuery = useSession();
    const sessionUser = sessionQuery?.data?.user;
    const deleteAccount = useDeleteAccount();
    const router = useRouter();

    const { data: isPlatformSetupUser, isPending: isSetupUserPending } = useQuery(
        convexQuery(api.setup.isCurrentUserPlatformSetupUser, {})
    );

    const [emailConfirmation, setEmailConfirmation] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

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
            router.replace('/login');
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : tCommon('genericErrorDescription');
            setError(errorMessage);
        }
    };

    if (sessionQuery?.isPending || isSetupUserPending) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isPlatformSetupUser) {
        return (
            <div
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6"
                data-testid="delete-account-protected"
            >
                <div className="flex items-start gap-4">
                    <Shield className="size-6 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-2">
                        <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                            {t('deleteAccountProtectedTitle')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('deleteAccountProtectedDescription')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
            <div className="flex items-start gap-4">
                <AlertTriangle className="size-6 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="font-semibold text-destructive">
                            {t('deleteAccountTitle')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('deleteAccountDescription')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmEmail" className="text-sm font-medium">
                            {t('deleteAccountConfirmLabel')}
                        </label>
                        <Input
                            id="confirmEmail"
                            type="email"
                            placeholder={t('deleteAccountPlaceholder')}
                            value={emailConfirmation}
                            onChange={e => setEmailConfirmation(e.target.value)}
                            className="border-destructive/30 bg-background focus-visible:ring-destructive/20"
                            data-testid="delete-account-email-input"
                        />
                        <p className="text-xs text-destructive">
                            {t('deleteAccountHelpText', { email: userEmail })}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">
                            {t('deleteAccountPasswordLabel')}
                        </label>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t('deleteAccountPasswordPlaceholder')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="border-destructive/30 bg-background focus-visible:ring-destructive/20"
                            data-testid="delete-account-password-input"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive" data-testid="delete-account-error">
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
                        {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {t('deleteAccountButton')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
