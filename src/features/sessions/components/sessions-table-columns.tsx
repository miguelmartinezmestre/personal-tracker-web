'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAgentIcon } from '@/features/sessions/components/user-agent';
import { BetterAuthDataModel } from '@/convex/rls';
import { useInvalidateSession } from './sessions-table-actions';

type SessionDocument = BetterAuthDataModel['session']['document'];

interface UseSessionsTableColumnsProps {
    currentSessionToken: string | undefined;
}

export function useSessionsTableColumns({ currentSessionToken }: UseSessionsTableColumnsProps) {
    const t = useTranslations('Sessions');
    const { invalidateSessionAsync, isInvalidatingSession } = useInvalidateSession();
    const [now] = useState(Date.now);

    const getSessionStatus = (session: SessionDocument) => {
        const isExpired = session.expiresAt < now;
        const isCurrentSession = currentSessionToken === session.token;

        if (isCurrentSession) {
            return { status: 'current', label: t('currentSession'), variant: 'default' as const };
        }
        if (isExpired) {
            return { status: 'expired', label: t('expired'), variant: 'secondary' as const };
        }
        return { status: 'active', label: t('active'), variant: 'outline' as const };
    };

    const columns: ColumnDef<SessionDocument>[] = [
        {
            accessorKey: 'userAgent',
            header: t('device'),
            cell: ({ row }) => {
                return <UserAgentIcon userAgent={row.original.userAgent ?? ''} />;
            },
        },
        {
            accessorKey: 'createdAt',
            header: t('date'),
            cell: ({ row }) => {
                return new Date(row.original.createdAt).toLocaleDateString();
            },
        },
        {
            accessorKey: 'expiresAt',
            header: t('expiresAt'),
            cell: ({ row }) => {
                return new Date(row.original.expiresAt).toLocaleDateString();
            },
        },
        {
            id: 'status',
            header: t('status'),
            cell: ({ row }) => {
                const { label, variant, status } = getSessionStatus(row.original);
                return (
                    <Badge variant={variant} data-testid={`session-status-badge-${status}`}>
                        {label}
                    </Badge>
                );
            },
        },
        {
            header: '',
            id: 'close-session',
            cell: ({ row }) => {
                const session = row.original;
                const { status } = getSessionStatus(session);

                // Don't show revoke button for current session or expired sessions
                if (status === 'current' || status === 'expired') {
                    return null;
                }

                return (
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={isInvalidatingSession}
                        onClick={async () => {
                            await invalidateSessionAsync({ token: session.token });
                        }}
                        data-testid="session-revoke-button"
                    >
                        {isInvalidatingSession ? t('revoking') : t('revoke')}
                    </Button>
                );
            },
        },
    ];

    return columns;
}
