import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '../components/table';
import { DashboardLayout } from '../components/dashboard-layout';
import { ColumnDef } from '@tanstack/react-table';
import { ObjetivesModal } from '../components/objetives-modal';
import { useQuery } from '@tanstack/react-query';
import { getObjectives } from '../services/objetives';
import { Objetive } from '../models/objetive';
import useAuth from '../hooks/useAuth';
export const Route = createFileRoute('/objetives')({
    component: RouteComponent,
});

function RouteComponent() {
    const auth = useAuth();

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['objetives'],
        queryFn: () => getObjectives(auth.id),
    });

    const columns: ColumnDef<Objetive>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
        },
        {
            accessorKey: 'description',
            header: 'Description',
        },
        {
            accessorKey: 'targetValue',
            header: 'Target Value',
        },
        {
            accessorKey: 'currentValue',
            header: 'Current Value',
        },
        {
            accessorKey: 'deadline',
            header: 'Deadline',
        },
        {
            accessorKey: 'status',
            header: 'Status',
        },
    ];

    if (isLoading) {
        return <div>Loading...</div>;
    }

    console.log(data);

    if (!data) {
        return <div>No data</div>;
    }

    return (
        <DashboardLayout>
            <ObjetivesModal refetch={refetch} />
            <DataTable columns={columns} data={data} />
        </DashboardLayout>
    );
}
