'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { getQueryClient } from '@/trpc/client';
import { Session } from '@/schemas/session';
import { UserAgentIcon } from '../user-agent';

export default function SessionsTable() {
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const sessions = useSuspenseQuery(trpc.sessions.getSessionsByUser.queryOptions({}));
    const invalidateSession = useMutation(trpc.sessions.invalidateSession.mutationOptions());

    const columns: ColumnDef<Session>[] = [
        {
            accessorKey: 'userAgent',
            header: 'Dispositivo',
            cell: ({ row }) => {
                return <UserAgentIcon userAgent={row.original.userAgent ?? ''} />;
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Fecha',
        },
        {
            accessorKey: 'status',
            header: 'Estado',
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
                            }}
                        >
                            Cerrar sesion
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
