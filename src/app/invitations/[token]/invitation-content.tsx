'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getInvitationCallbackPath } from '@/convex/utils';
import { InvitationActivationPending } from '@/features/organizations/components/invitation-activation-pending';
import {
    acceptInvitationAndActivateOrganization,
    activateAcceptedOrganization,
} from '@/features/organizations/lib/accept-invitation';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';

type InvitationStatus = 'ready' | 'accepting' | 'accepted' | 'error';

interface InvitationContentProps {
    token: string;
}

export default function InvitationContent({ token }: InvitationContentProps) {
    const router = useRouter();
    const t = useTranslations('Invitations');
    const sessionQuery = useQuery(convexQuery(api.organizations.getCurrentSession, {}));

    const [status, setStatus] = useState<InvitationStatus>('ready');
    const [errorMessage, setErrorMessage] = useState('');
    const [pendingOrganization, setPendingOrganization] = useState<string | null>(null);
    const loginSearchParams = new URLSearchParams({
        callbackUrl: getInvitationCallbackPath(token),
    });
    const registerSearchParams = new URLSearchParams({ invitation: token });

    useEffect(() => {
        if (status === 'accepted') {
            const timer = setTimeout(() => {
                router.push('/dashboard/organizations');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status, router]);

    async function handleAccept() {
        setStatus('accepting');
        setErrorMessage('');

        try {
            const result = await acceptInvitationAndActivateOrganization({
                invitationId: token,
            });
            if (result.status === 'acceptedActivationPending') {
                setPendingOrganization(result.organizationId);
                setStatus('ready');
            } else {
                router.refresh();
                setStatus('accepted');
            }
        } catch {
            setStatus('error');
            setErrorMessage(t('errorAccepting'));
        }
    }

    async function retryActivation() {
        if (!pendingOrganization) {
            return;
        }
        setStatus('accepting');
        try {
            await activateAcceptedOrganization(pendingOrganization);
            setPendingOrganization(null);
            setStatus('accepted');
        } catch {
            setStatus('ready');
            setErrorMessage(t('errorAccepting'));
        }
    }
    if (pendingOrganization) {
        return (
            <InvitationActivationPending
                isPending={status === 'accepting'}
                error={errorMessage}
                retry={retryActivation}
            />
        );
    }
    if (sessionQuery.isPending) {
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
                        <Button render={<Link href="/dashboard/home" />} className="w-full">
                            {t('goToDashboard')}
                        </Button>
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

    if (!sessionQuery.data?.user && status === 'ready') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t('loginRequiredTitle')}</CardTitle>
                        <CardDescription>{t('loginRequiredDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={() => router.push(`/login?${loginSearchParams.toString()}`)}
                            className="w-full"
                        >
                            {t('login')}
                        </Button>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">{t('noAccount')} </span>
                            <Button
                                variant="link"
                                className="h-auto p-0"
                                onClick={() =>
                                    router.push(`/register?${registerSearchParams.toString()}`)
                                }
                            >
                                {t('register')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    let acceptButtonContent;
    if (status === 'accepting') {
        acceptButtonContent = (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('accepting')}
            </>
        );
    } else {
        acceptButtonContent = t('accept');
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
                        onClick={() => {
                            void handleAccept();
                        }}
                        disabled={status === 'accepting'}
                        className="w-full"
                    >
                        {acceptButtonContent}
                    </Button>
                    <Button
                        render={<Link href="/dashboard/home" />}
                        variant="ghost"
                        className="w-full"
                    >
                        {t('cancel')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
