'use client';

import { useRouter } from 'next/navigation';
import { activateAcceptedOrganization } from '../lib/accept-invitation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/components/table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    usePendingInvitations,
    useAcceptInvitation,
    useRejectInvitation,
} from '@/features/organizations/hooks/use-invitations';
import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InvitationActions } from './invitation-actions';
import type { Invitation } from '@/features/organizations/hooks/use-invitations';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';

// Narrow screens keep the organization and the buttons; the rest is secondary.
const MOBILE_HIDDEN_COLUMNS = {
    role: 'hidden sm:table-cell',
    invitedBy: 'hidden md:table-cell',
};

function VerificationAlert({
    verificationSent,
    isPending,
    onSend,
}: {
    verificationSent: boolean;
    isPending: boolean;
    onSend: () => void;
}) {
    const t = useTranslations('Invitations');
    let message = t('verificationRequiredDescription');
    if (verificationSent) {
        message = t('verificationEmailSent');
    }
    let buttonLabel = t('sendVerificationEmail');
    if (isPending) {
        buttonLabel = t('sendingVerificationEmail');
    }
    return (
        <Alert data-testid="invitation-verification-required">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>{t('verificationRequiredTitle')}</AlertTitle>
            <AlertDescription className="space-y-3">
                <p>{message}</p>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="invitation-send-verification-email"
                    disabled={isPending || verificationSent}
                    onClick={onSend}
                >
                    {buttonLabel}
                </Button>
            </AlertDescription>
        </Alert>
    );
}

export function InvitationsList() {
    const t = useTranslations('Invitations');
    const tMembers = useTranslations('OrganizationMembers');
    const { data: invitations, ...pagination } = usePendingInvitations();
    const { isLoading } = pagination;
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const acceptInvitation = useAcceptInvitation();
    const rejectInvitation = useRejectInvitation();
    const [actionError, setActionError] = useState('');
    const [pendingOrganization, setPendingOrganization] = useState<string | null>(null);
    const router = useRouter();
    const activation = useMutation({
        mutationFn: activateAcceptedOrganization,
        onSuccess: () => {
            setPendingOrganization(null);
            router.refresh();
        },
    });
    const [verificationSent, setVerificationSent] = useState(false);
    const currentUser = session.data?.user;
    const requiresEmailVerification = Boolean(currentUser && !currentUser.emailVerified);

    const sendVerificationEmail = useMutation({
        mutationFn: async () => {
            if (!currentUser?.email) {
                throw new Error('Missing authenticated user email');
            }

            const result = await authClient.sendVerificationEmail({
                email: currentUser.email,
                callbackURL: '/dashboard/invitations',
            });
            throwIfAuthClientError(result);
        },
        onSuccess: () => {
            setActionError('');
            setVerificationSent(true);
        },
        onError: () => {
            setVerificationSent(false);
            setActionError(t('verificationEmailError'));
        },
    });

    async function handleAccept(invitationId: string, organizationId: string) {
        setActionError('');
        try {
            const result = await acceptInvitation.mutateAsync({ invitationId, organizationId });
            if (result.status === 'acceptedActivationPending') {
                setPendingOrganization(result.organizationId);
            }
        } catch {
            setActionError(t('errorAccepting'));
        }
    }

    async function handleReject(invitationId: string) {
        setActionError('');
        try {
            await rejectInvitation.mutateAsync(invitationId);
        } catch {
            setActionError(t('errorRejecting'));
        }
    }

    if (pendingOrganization) {
        return (
            <Alert data-testid="invitation-activation-pending">
                <AlertTitle>{t('activationPendingTitle')}</AlertTitle>
                <AlertDescription>
                    <p>{t('activationPendingDescription')}</p>
                    <Button
                        disabled={activation.isPending}
                        onClick={() => activation.mutate(pendingOrganization)}
                    >
                        {t('retryActivation')}
                    </Button>
                    {activation.isError ? <p role="alert">{t('errorAccepting')}</p> : null}
                </AlertDescription>
            </Alert>
        );
    }
    if (isLoading) {
        return (
            <div className="text-center py-8" data-testid="invitations-loading">
                {t('loading')}
            </div>
        );
    }

    const pendingInvitations = invitations;

    // Unverified accounts get no invitations from the backend, only the prompt to verify.
    if (requiresEmailVerification) {
        return (
            <VerificationAlert
                verificationSent={verificationSent}
                isPending={sendVerificationEmail.isPending}
                onSend={() => sendVerificationEmail.mutate()}
            />
        );
    }

    if (pendingInvitations.length === 0) {
        if (acceptInvitation.isPending) {
            return (
                <div className="text-center py-16" data-testid="invitations-joining">
                    <p className="text-sm text-muted-foreground">{t('joining')}</p>
                </div>
            );
        }

        return (
            <div className="text-center py-16" data-testid="invitations-empty">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('noPendingTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('noPendingDescription')}</p>
            </div>
        );
    }

    let actionErrorAlert = null;
    if (actionError) {
        actionErrorAlert = (
            <Alert variant="destructive" data-testid="invitation-action-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
            </Alert>
        );
    }

    const columns: ColumnDef<DataTableFeatures, Invitation>[] = [
        {
            id: 'organization',
            header: t('columns.organization'),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.organization?.name}</span>
            ),
        },
        {
            id: 'role',
            header: t('columns.role'),
            cell: ({ row }) => tMembers(`roles.${row.original.role}`),
        },
        {
            id: 'invitedBy',
            header: t('invitedBy'),
            cell: ({ row }) => row.original.inviter?.name ?? t('unknownInviter'),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('columns.actions')}</span>,
            cell: ({ row }) => (
                <InvitationActions
                    invitation={row.original}
                    onAccept={() => void handleAccept(row.original.id, row.original.organizationId)}
                    onReject={() => void handleReject(row.original.id)}
                    isAccepting={acceptInvitation.isPending}
                    isRejecting={rejectInvitation.isPending}
                    isResponseDisabled={session.isPending}
                />
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {actionErrorAlert}
            <p className="text-sm text-muted-foreground">{t('orgSwitchNote')}</p>
            <div data-testid="invitations-list">
                <DataTable
                    columns={columns}
                    columnClassNames={MOBILE_HIDDEN_COLUMNS}
                    data={pendingInvitations}
                    pagination={pagination}
                />
            </div>
        </div>
    );
}
