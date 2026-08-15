'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/format-date';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAgentIcon } from '@/features/sessions/components/user-agent';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';
import { useInvalidateSession } from './sessions-table-actions';

type SessionListItem = FunctionReturnType<typeof api.sessions.getSessionsByUser>['page'][number];

export function useSessionsTableColumns() {
    const t = useTranslations('Sessions');
    const locale = useLocale();
    const { invalidateSessionAsync, isInvalidatingSession } = useInvalidateSession();
    const [now] = useState(Date.now);

    const getSessionStatus = (session: SessionListItem) => {
        const isExpired = session.expiresAt < now;

        if (session.isCurrent) {
            return { status: 'current', label: t('currentSession'), variant: 'default' as const };
        }
        if (isExpired) {
            return { status: 'expired', label: t('expired'), variant: 'secondary' as const };
        }
        return { status: 'active', label: t('active'), variant: 'outline' as const };
    };

    const columns: ColumnDef<DataTableFeatures, SessionListItem>[] = [
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
                return formatDate(row.original.createdAt, locale);
            },
        },
        {
            accessorKey: 'expiresAt',
            header: t('expiresAt'),
            cell: ({ row }) => {
                return formatDate(row.original.expiresAt, locale);
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

                if (status === 'current' || status === 'expired') {
                    return null;
                }

                return (
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={isInvalidatingSession}
                        onClick={async () => {
                            await invalidateSessionAsync({ sessionId: session._id });
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
