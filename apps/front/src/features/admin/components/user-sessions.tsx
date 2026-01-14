'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { authClient } from '@/features/auth/auth-client';
import { DataTable } from '@/features/table/components/table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@repo/ui/components/badge';
import { Trash2, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

type Session = {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date | number;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date | number;
};

export function UserSessions() {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const [userId, setUserId] = useState('');
    const queryClient = useQueryClient();

    const { data: sessions, isLoading } = useQuery({
        queryKey: ['user-sessions', userId],
        queryFn: async () => {
            if (!userId) return { sessions: [] };
            const result = await authClient.admin.listUserSessions({ userId });
            return result;
        },
        enabled: !!userId,
    });

    // Normalize the sessions data structure
    const sessionsList =
        sessions && 'data' in sessions && sessions.data
            ? sessions.data.sessions
            : sessions && 'sessions' in sessions
                ? sessions.sessions
                : [];

    const revokeSession = useMutation({
        mutationFn: async ({ sessionToken }: { sessionToken: string }) => {
            return await authClient.admin.revokeUserSession({ sessionToken });
        },
        onSuccess: () => {
            toast.success(t('userSessions.toast.revokeSuccess'));
            queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeFailed', { message: error.message }));
        },
    });

    const revokeAllSessions = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            if (!confirm(t('userSessions.confirm.revokeAll'))) {
                return;
            }
            return await authClient.admin.revokeUserSessions({ userId });
        },
        onSuccess: () => {
            toast.success(t('userSessions.toast.revokeAllSuccess'));
            queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
        },
        onError: (error: Error) => {
            toast.error(t('userSessions.toast.revokeAllFailed', { message: error.message }));
        },
    });

    // Verify admin role
    // try {
    //     useRequireAdmin();
    // } catch {
    //     return (
    //         <div className="rounded-md border border-red-200 bg-red-50 p-6">
    //             <div className="flex items-center gap-3">
    //                 <ShieldAlert className="h-5 w-5 text-red-600" />
    //                 <div>
    //                     <h3 className="font-semibold text-red-800">{t('accessDeniedTitle')}</h3>
    //                     <p className="text-sm text-red-600">{t('accessDeniedDescription')}</p>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    const columns: ColumnDef<Session>[] = [
        {
            accessorKey: 'id',
            header: t('userSessions.columns.id'),
            cell: ({ row }) => (
                <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>
            ),
        },
        {
            accessorKey: 'expiresAt',
            header: t('userSessions.columns.expires'),
            cell: ({ row }) => {
                const expiresAt = row.original.expiresAt;
                const expiresAtDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
                const isExpired = expiresAtDate.getTime() < Date.now();
                return (
                    <div>
                        <div className={isExpired ? 'text-red-500' : ''}>
                            {format(expiresAtDate, 'PPp')}
                        </div>
                        {isExpired && (
                            <Badge variant="destructive" className="mt-1">
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
                    onClick={() => revokeSession.mutate({ sessionToken: row.original.token })}
                    disabled={revokeSession.isPending}
                    data-testid="session-terminate-button"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder={tCommon('placeholders.userIdForSessions')}
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="flex-1"
                    data-testid="user-sessions-userid-input"
                />
                {userId && (
                    <Button
                        variant="destructive"
                        onClick={() => revokeAllSessions.mutate({ userId })}
                        disabled={revokeAllSessions.isPending}
                        data-testid="user-sessions-revoke-all-button"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('userSessions.buttons.revokeAll')}
                    </Button>
                )}
            </div>
            {userId ? (
                <>
                    <DataTable columns={columns} data={sessionsList} isLoading={isLoading} />
                    {sessionsList.length === 0 && !isLoading && (
                        <p className="text-center text-muted-foreground py-8">
                            {t('userSessions.emptyWithUser')}
                        </p>
                    )}
                </>
            ) : (
                <p className="text-center text-muted-foreground py-8">
                    {t('userSessions.emptyNoUser')}
                </p>
            )}
        </div>
    );
}
