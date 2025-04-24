import { createFileRoute, Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../components/table';
import { useAuthContext } from '../../../providers/auth-provider';
import { Notification } from '../../../models/notification';
import { useNotificationsQuery } from '../../../services/queries/notifications';

export const Route = createFileRoute('/dashboard/notifications/')({
    component: RouteComponent,
});

function RouteComponent() {
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const { data, isLoading } = useNotificationsQuery(user?.id ?? 0);

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
            cell: ({ row }) => {
                const goalId = row.original.goalId;
                return <Link to="/dashboard/objectives/$id" params={{ id: String(goalId) }}>Objetivo {goalId}</Link>;
            },
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
