import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { DashboardLayout } from '../../../components/dashboard-layout';
import { DataTable } from '../../../components/table';
import useAuth from '../../../hooks/useAuth';
import { getNotifications } from '../../../services/notifications';

export const Route = createFileRoute('/dashboard/notifications/')({
    component: RouteComponent,
});

function RouteComponent() {
    const auth = useAuth();

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => getNotifications(auth.id),
    });

    const columns: ColumnDef<Notification>[] = [
        {
            accessorKey: 'message',
            header: 'Message',
        },
        {
            accessorKey: 'notificationDate',
            header: 'Notification Date',
        },
        {
            accessorKey: 'goalId',
            header: 'Goal completed',
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
            <DataTable columns={columns} data={data} />
        </DashboardLayout>
    );
}
