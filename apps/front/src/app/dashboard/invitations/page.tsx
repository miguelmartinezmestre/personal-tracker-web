'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { usePendingInvitations, useAcceptInvitation, useRejectInvitation } from '@/hooks/api/use-invitations';
import { InvitationCard } from '@/components/invitations/invitation-card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@repo/ui/components/alert';

function InvitationsList() {
    const t = useTranslations('Invitations');
    const { data: invitations, isLoading, error } = usePendingInvitations();
    const acceptInvitation = useAcceptInvitation();
    const rejectInvitation = useRejectInvitation();

    if (isLoading) {
        return <div className="text-center py-8">{t('loading')}</div>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {t('errorLoading')}: {error.message}
                </AlertDescription>
            </Alert>
        );
    }

    const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') ?? [];

    if (pendingInvitations.length === 0) {
        return (
            <div className="text-center py-16">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('noPendingTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('noPendingDescription')}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingInvitations.map(invitation => (
                <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={() => acceptInvitation.mutate(invitation.id)}
                    onReject={() => rejectInvitation.mutate(invitation.id)}
                    isAccepting={acceptInvitation.isPending}
                    isRejecting={rejectInvitation.isPending}
                />
            ))}
        </div>
    );
}

export default function InvitationsPage() {
    const t = useTranslations('Invitations');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <Suspense fallback={<div className="text-center py-8">{t('loading')}</div>}>
                <InvitationsList />
            </Suspense>
        </div>
    );
}
