'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authClient } from '@/features/auth/auth-client';
import { useSession } from '@/features/auth/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

type InvitationStatus = 'ready' | 'accepting' | 'accepted' | 'error';

interface InvitationContentProps {
    token: string;
}

export default function InvitationContent({ token }: InvitationContentProps) {
    const router = useRouter();
    const t = useTranslations('Invitations');
    const sessionQuery = useSession();

    const [status, setStatus] = useState<InvitationStatus>('ready');
    const [errorMessage, setErrorMessage] = useState('');

    async function handleAccept() {
        setStatus('accepting');
        setErrorMessage('');

        try {
            await authClient.organization.acceptInvitation({
                invitationId: token,
            });
            setStatus('accepted');

            setTimeout(() => {
                router.push('/dashboard/organizations');
            }, 2000);
        } catch {
            setStatus('error');
            setErrorMessage(t('errorAccepting'));
        }
    }

    function handleGoToRegister() {
        router.push(`/register?invitation=${token}`);
    }

    function handleGoToLogin() {
        router.push(`/login?callbackURL=/invitations/${token}`);
    }

    if (sessionQuery?.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">{t('loading')}</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <AlertCircle className="h-12 w-12 text-destructive" />
                        <CardTitle>{t('errorTitle')}</CardTitle>
                        <CardDescription>{errorMessage || t('errorDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/home">
                            <Button className="w-full">{t('goToDashboard')}</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'accepted') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <CardTitle>{t('acceptedTitle')}</CardTitle>
                        <CardDescription>{t('acceptedDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{t('redirecting')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!sessionQuery?.data?.user && status === 'ready') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t('loginRequiredTitle')}</CardTitle>
                        <CardDescription>{t('loginRequiredDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleGoToLogin} className="w-full">
                            {t('login')}
                        </Button>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">{t('noAccount')} </span>
                            <Button
                                variant="link"
                                className="h-auto p-0"
                                onClick={handleGoToRegister}
                            >
                                {t('register')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t('acceptTitle')}</CardTitle>
                    <CardDescription>{t('acceptDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleAccept}
                        disabled={status === 'accepting'}
                        className="w-full"
                    >
                        {status === 'accepting' ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('accepting')}
                            </>
                        ) : (
                            t('accept')
                        )}
                    </Button>
                    <Link href="/dashboard/home">
                        <Button variant="ghost" className="w-full">
                            {t('cancel')}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
