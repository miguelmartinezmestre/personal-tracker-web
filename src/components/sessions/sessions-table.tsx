'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import type { Doc } from '../../../convex/_generated/dataModel';
import { UserAgentIcon } from '../user-agent';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

export default function SessionsTable() {
    const t = useTranslations('Sessions');
    const sessions = useSuspenseQuery(convexQuery(api.sessions.getSessionsByUser, {}));
    const invalidateSession = useMutation({ mutationFn: useConvexMutation(api.sessions.invalidateSession) });
    const router = useRouter();

    const columns: ColumnDef<Doc<"sessions">>[] = [
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
                                await invalidateSession.mutateAsync({ id: objetiveRow._id });
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
            <DataTable columns={columns} data={sessions.data ?? []} isLoading={sessions.isLoading} />
        </div>
    );
}
