import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '../components/table';
import { DashboardLayout } from '../components/dashboard-layout';
import { ColumnDef } from '@tanstack/react-table';
import { ObjetivesModal } from '../components/objetives-modal';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../services/notifications';
import { Notification } from '../models/notification';
import useAuth from '../hooks/useAuth';
export const Route = createFileRoute('/notifications')({
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
            accessorKey: 'id',
            header: 'Id',
        },
        {
            accessorKey: 'goalId',
            header: 'Goal Id',
        },
        {
            accessorKey: 'notificationType',
            header: 'Notification Type',
        },
        {
            accessorKey: 'notificationDate',
            header: 'Notification Date',
        },
        {
            accessorKey: 'message',
            header: 'Message',
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
