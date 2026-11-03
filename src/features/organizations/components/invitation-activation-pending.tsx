'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function InvitationActivationPending({
    isPending,
    error,
    retry,
}: {
    isPending: boolean;
    error: string;
    retry: () => Promise<void>;
}) {
    const t = useTranslations('Invitations');

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t('activationPendingTitle')}</CardTitle>
                    <CardDescription>{t('activationPendingDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? <p role="alert">{error}</p> : null}
                    <Button
                        disabled={isPending}
                        onClick={() => {
                            void retry();
                        }}
                    >
                        {t('retryActivation')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
