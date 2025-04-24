import { createFileRoute } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/table';
import { Session } from '../../../models/session';
import { useAuthContext } from '../../../providers/auth-provider';
import { UserAgentIcon } from '../../../components/user-agent';
import { useSessionsQuery } from '../../../services/queries/sessions';
export const Route = createFileRoute('/dashboard/sessions/')({
    component: RouteComponent,
});

function RouteComponent() {
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const { data, isLoading } = useSessionsQuery(user?.id ?? 0);

    const columns: ColumnDef<Session>[] = [
        {
            accessorKey: 'userAgent',
            header: 'Dispositivo',
            cell: ({ row }) => {
                return <UserAgentIcon userAgent={row.original.userAgent} />;
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Fecha',
        },
    ];

    if (isLoading || isLoadingAuth) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>No data</div>;
    }

    return (
        <>
            <DataTable columns={columns} data={data} />
        </>
    );
}
