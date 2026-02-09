'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import {
    usePendingInvitations,
    useAcceptInvitation,
    useRejectInvitation,
} from '@/features/organizations/hooks/use-invitations';
import { InvitationCard } from './invitation-card';

function InvitationsList() {
    const t = useTranslations('Invitations');
    const { data: invitations, isLoading } = usePendingInvitations();
    const acceptInvitation = useAcceptInvitation();
    const rejectInvitation = useRejectInvitation();

    if (isLoading) {
        return (
            <div className="text-center py-8" data-testid="invitations-loading">
                {t('loading')}
            </div>
        );
    }

    const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') ?? [];

    if (pendingInvitations.length === 0) {
        return (
            <div className="text-center py-16" data-testid="invitations-empty">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('noPendingTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('noPendingDescription')}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="invitations-list">
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

export default function InvitationsLayout() {
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
