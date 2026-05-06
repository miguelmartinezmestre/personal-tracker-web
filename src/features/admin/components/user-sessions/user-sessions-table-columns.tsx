import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { useRevokeSession } from './user-sessions-table-actions';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';
import type { Id } from '@/convex/_generated/dataModel';

type AdminSessionRow = FunctionReturnType<typeof api.admin.listUserSessions>['page'][number];

export function useUserSessionsTableColumns(targetUserId: Id<'user'> | undefined) {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const { revokeSession, isRevokingSession } = useRevokeSession();
    const [now] = useState(Date.now);

    const columns: ColumnDef<AdminSessionRow>[] = [
        {
            accessorKey: '_id',
            header: t('userSessions.columns.id'),
            cell: ({ row }) => <span className="font-mono text-xs">{row.original._id}</span>,
        },
        {
            accessorKey: 'expiresAt',
            header: t('userSessions.columns.expires'),
            cell: ({ row }) => {
                const expiresAt = row.original.expiresAt;
                const expiresAtDate = new Date(expiresAt);
                const isExpired = expiresAtDate.getTime() < now;
                return (
                    <div>
                        <div className={isExpired ? 'text-red-500' : ''}>
                            {format(expiresAtDate, 'PPp')}
                        </div>
                        {isExpired && (
                            <Badge className="mt-1 bg-red-500 text-white">
                                {tCommon('status.expired')}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'ipAddress',
            header: t('userSessions.columns.ip'),
            cell: ({ row }) => row.original.ipAddress || tCommon('status.na'),
        },
        {
            accessorKey: 'userAgent',
            header: t('userSessions.columns.userAgent'),
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground max-w-xs truncate block">
                    {row.original.userAgent || tCommon('status.na')}
                </span>
            ),
        },
        {
            header: t('userSessions.columns.actions'),
            id: 'actions',
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                        if (!targetUserId) return;
                        revokeSession({ userId: targetUserId, sessionId: row.original._id });
                    }}
                    disabled={isRevokingSession || !targetUserId}
                    data-testid="session-terminate-button"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return columns;
}
