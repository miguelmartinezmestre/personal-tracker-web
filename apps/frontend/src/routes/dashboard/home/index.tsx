import { createFileRoute } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { Objetive } from '../../../models/objetive';
import { Graph1 } from '../../../components/graph1';
import { Graph2 } from '../../../components/graph2';
import { Graph3 } from '../../../components/graph3';
import { DataTable } from '../../../components/table';
import { useAuthContext } from '../../../providers/auth-provider';
import { useObjectivesQuery } from '../../../services/queries/objectives';

export const Route = createFileRoute('/dashboard/home/')({
    component: RouteComponent,
});

export type Goal = {
    id: number;
    userId: number;
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    deadline: Date;
    status: string;
    unit: string;
};

function RouteComponent() {
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const { data, isLoading } = useObjectivesQuery(user.id);

    const columns: ColumnDef<Objetive>[] = [
        {
            accessorKey: 'title',
            header: 'Titulo',
        },
        {
            accessorKey: 'description',
            header: 'Descripción',
        },
        {
            accessorKey: 'targetValue',
            header: 'Valor Objetivo',
        },
        {
            accessorKey: 'currentValue',
            header: 'Valor Actual',
        },
        {
            accessorKey: 'deadline',
            header: 'Fecha Limite',
        },
        {
            accessorKey: 'status',
            header: 'Estado',
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Graph1 />
                <Graph2 />
                <Graph3 />
            </div>
            <DataTable columns={columns} data={data} />
        </>
    );
}
