'use client';

import { DataTable } from '@/features/table/components/table';
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { UserAgentIcon } from '@/features/sessions/components/user-agent';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { BetterAuthDataModel } from '@repo/backend/convex/rls';
import { Badge } from '@repo/ui/components/badge';
import { toast } from 'sonner';
import { authClient } from '@/features/auth/auth-client';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
};

export default function SessionsTable() {
    const t = useTranslations('Sessions');
    const queryClient = useQueryClient();
    const sessions = useSuspenseQuery(convexQuery(api.sessions.getSessionsByUser, DEFAULT_PAGINATION_OPTS));

    // Get current session to prevent revoking it
    const currentSession = authClient.useSession();

    const invalidateSession = useMutation({
        mutationFn: useConvexMutation(api.sessions.invalidateSession),
        onSuccess: () => {
            toast.success(t('sessionRevoked'));
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('sessionRevokeFailed'));
        },
    });

    const getSessionStatus = (session: BetterAuthDataModel['session']['document']) => {
        const now = Date.now();
        const isExpired = session.expiresAt < now;
        const isCurrentSession = currentSession.data?.session?.token === session.token;

        if (isCurrentSession) {
            return { status: 'current', label: t('currentSession'), variant: 'default' as const };
        }
        if (isExpired) {
            return { status: 'expired', label: t('expired'), variant: 'secondary' as const };
        }
        return { status: 'active', label: t('active'), variant: 'outline' as const };
    };

    const columns: ColumnDef<BetterAuthDataModel['session']['document']>[] = [
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
                const { label, variant } = getSessionStatus(row.original);
                return <Badge variant={variant}>{label}</Badge>;
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
                        disabled={invalidateSession.isPending}
                        onClick={async () => {
                            await invalidateSession.mutateAsync({ _id: session._id });
                        }}
                    >
                        {invalidateSession.isPending ? t('revoking') : t('revoke')}
                    </Button>
                );
            },
        },
    ];

    return (
        <div>
            <DataTable
                columns={columns}
                data={sessions.data ?? []}
                isLoading={sessions.isLoading}
            />
        </div>
    );
}
