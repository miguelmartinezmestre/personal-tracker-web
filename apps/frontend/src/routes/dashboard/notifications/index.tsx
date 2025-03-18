import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/table';
import { getNotifications } from '../../../services/notifications';
import { useAuthContext } from '../../../providers/auth-provider';
import { Notification } from '../../../models/notification';

export const Route = createFileRoute('/dashboard/notifications/')({
    component: RouteComponent,
});

function RouteComponent() {
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    if (isLoadingAuth) {
        return <div>Loading...</div>;
    }

    const { data, isLoading } = useQuery({
        queryKey: ['notifications', { userId: user?.id }],
        queryFn: () => getNotifications(user?.id ?? 0),
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

    return (
        <>
            <DataTable columns={columns} data={data} />
        </>
    );
}
