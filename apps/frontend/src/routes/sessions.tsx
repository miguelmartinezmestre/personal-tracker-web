import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '../components/table';
import { DashboardLayout } from '../components/dashboard-layout';
import { ColumnDef } from '@tanstack/react-table';
import { ObjetivesModal } from '../components/objetives-modal';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../services/sessions';
import { Session } from '../models/session';
export const Route = createFileRoute('/sessions')({
    component: RouteComponent,
});

function RouteComponent() {
    const { data, refetch, isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: getSessions,
    });

    const columns: ColumnDef<Session>[] = [
        {
            accessorKey: 'id',
            header: 'Id',
        },
        {
            accessorKey: 'value',
            header: 'Value',
        },
        {
            accessorKey: 'userId',
            header: 'User Id',
        },
    ];

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>No data</div>;
    }

    console.log(data);

    return (
        <DashboardLayout>
            <ObjetivesModal refetch={refetch} />
            <DataTable columns={columns} data={data} />
        </DashboardLayout>
    );
}
