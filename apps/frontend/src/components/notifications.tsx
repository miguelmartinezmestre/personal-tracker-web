import { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { useAuthContext } from "../providers/auth-provider";
import { useNotificationsQuery } from "../services/queries/notifications";
import { DataTable } from "./table";
import { Notification } from "../models/notification";

export default function Notifications() {
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const { data, isLoading } = useNotificationsQuery(user.id);

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
                return (
                    <Link to="/dashboard/objectives/$id" params={{ id: String(goalId) }}>
                        Objetivo {goalId}
                    </Link>
                );
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
