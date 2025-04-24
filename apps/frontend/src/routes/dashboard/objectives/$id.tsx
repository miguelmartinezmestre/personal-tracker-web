import { createFileRoute, useParams } from '@tanstack/react-router';
import { DataTable } from '../../../components/table';
import { ColumnDef } from '@tanstack/react-table';
import { useAuthContext } from '../../../providers/auth-provider';
import { Graph3, Progress } from '../../../components/graph3';
import { Modal } from '../../../components/modal';
import { GenericForm } from '../../../components/generic-form';
import { useState } from 'react';
import { UpdateProgress } from '../../../models/update-progress';
import { z } from 'zod';
import { useObjectiveQuery } from '../../../services/queries/objective';
import { useUpdateProgressQuery } from '../../../services/queries/update-progress';
import { schema } from '../../../schemas/update-progress';
import { useUpdateProgressMutation } from '../../../services/mutations/update-progress';

export const Route = createFileRoute('/dashboard/objectives/$id')({
    component: RouteComponent,
});

function RouteComponent() {
    const { id } = useParams({ strict: false });

    const defaultValues = {
        goalId: Number(id),
        updatedValue: 0,
        updateDate: new Date(),
        comment: '',
    };

    const { user, isLoading: isLoadingAuth } = useAuthContext();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string>('');

    const { data, refetch, isLoading } = useUpdateProgressQuery(user?.id ?? 0, Number(id));

    const { data: objetiveData, isLoading: isLoadingObjetive } = useObjectiveQuery(user?.id ?? 0, Number(id));

    const { mutation } = useUpdateProgressMutation(setError, setOpen, refetch);

    const columns: ColumnDef<UpdateProgress>[] = [
        {
            accessorKey: 'updatedValue',
            header: 'Valor Actual',
        },
        {
            accessorKey: 'updateDate',
            header: 'Fecha',
        },
        {
            accessorKey: 'comment',
            header: 'Comentario',
        },
        // {
        //     header: 'Update progress',
        //     id: 'update-progress',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     setUpdateOpen(true);
        //                     setUpdateValues(objetiveRow);
        //                 }}
        //             >
        //                 Update progress
        //             </Button>
        //         );
        //     },
        // },
        // {
        //     header: 'Ir actividad',
        //     id: 'go-to-activity',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         if (objetiveRow.id) {
        //             return (
        //                 <Link to="/dashboard/objetives/$id" params={{ id: String(objetiveRow.id) }}>
        //                     Ir actividad
        //                 </Link>
        //             );
        //         }

        //         return null;
        //     },
        // },
        // {
        //     header: 'Edit',
        //     id: 'actions',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     alert(`Action for ${objetiveRow.title}`);
        //                 }}
        //             >
        //                 Edit
        //             </Button>
        //         );
        //     },
        // },
        // {
        //     header: 'Delete',
        //     id: 'actions',
        //     cell: ({ row }) => {
        //         const objetiveRow = row.original;
        //         return (
        //             <Button
        //                 onClick={() => {
        //                     alert(`Action for ${objetiveRow.title}`);
        //                 }}
        //             >
        //                 Delete
        //             </Button>
        //         );
        //     },
        // },
    ];

    if (isLoading || isLoadingObjetive || isLoadingAuth) {
        return <div>Loading...</div>;
    }

    if (!data || !objetiveData) {
        return <div>No data</div>;
    }

    function onSubmit(values: z.infer<typeof schema>) {
        mutation.mutate(values);
    }

    const progressData: Progress[] = data.map(item => ({
        date: new Date(item.updateDate),
        currentValue: item.updatedValue,
        objetive: objetiveData.targetValue,
    }));

    return (
        <>
            <Graph3 data={progressData} />

            <Modal
                title="Objetive"
                description="Create a new objetive"
                isOpen={open}
                onOpenChange={setOpen}
                buttonText="Update progress"
            >
                <GenericForm schema={schema} defaultValues={defaultValues} onSubmit={onSubmit} />
            </Modal>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
                <DataTable columns={columns} data={data} />
            </div>
        </>
    );
}
