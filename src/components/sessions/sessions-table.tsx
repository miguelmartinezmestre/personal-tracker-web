'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { getQueryClient } from '@/trpc/client';
import { Session } from '@/schemas/session';
import { UserAgentIcon } from '../user-agent';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function SessionsTable() {
    const t = useTranslations('Sessions');
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const sessions = useSuspenseQuery(trpc.sessions.getSessionsByUser.queryOptions({}));
    const invalidateSession = useMutation(trpc.sessions.invalidateSession.mutationOptions());
    const router = useRouter();

    const columns: ColumnDef<Session>[] = [
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
        },
        {
            accessorKey: 'status',
            header: t('status'),
        },
        {
            header: '',
            id: 'close-session',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                if (objetiveRow.status === 'active') {
                    return (
                        <Button
                            onClick={async () => {
                                await invalidateSession.mutateAsync({ id: objetiveRow.id });
                                await queryClient.invalidateQueries(trpc.sessions.getSessionsByUser.queryOptions({}));
                                router.refresh();
                            }}
                        >
                            {t('closeSession')}
                        </Button>
                    );
                }
                return null;
            },
        },
    ];





    return (
        <div>
            <DataTable columns={columns} data={sessions.data!} isLoading={sessions.isLoading} />
        </div>
    );
}
