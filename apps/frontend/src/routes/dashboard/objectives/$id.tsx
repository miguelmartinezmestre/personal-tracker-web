import { createFileRoute, useParams } from '@tanstack/react-router';
import { DataTable } from '../../../components/table';
import { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../providers/auth-provider';
import { Graph3, Progress } from '../../../components/graph3';
import { Modal } from '../../../components/modal';
import { GenericForm } from '../../../components/generic-form';
import { useState } from 'react';
import {
    createUpdateProgress,
    getUpdateProgress,
    updateUpdateProgress,
} from '../../../services/update-progress';
import { UpdateProgress } from '../../../models/update-progress';
import { z } from 'zod';
import { getObjective } from '../../../services/objectives';

const defaultValues = {
    goalId: 0,
    updatedValue: 0,
    updateDate: new Date(),
    comment: '',
};

const schema = z.object({
    id: z.number().optional(),
    goalId: z.number().optional(),
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date(),
    comment: z.string().min(1, { message: 'Comment is required' }),
});

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
    const [updateOpen, setUpdateOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState<z.infer<typeof schema>>(defaultValues);
    const [error, setError] = useState<string>('');
    if (isLoadingAuth) {
        return <div>Loading...</div>;
    }

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['update-progress', { userId: user?.id, goalId: Number(id) }],
        queryFn: () => getUpdateProgress(Number(id)),
    });

    const { data: objetiveData, isLoading: isLoadingObjetive } = useQuery({
        queryKey: ['objetive', { userId: user?.id, goalId: Number(id) }],
        queryFn: () => getObjective(Number(id)),
    });

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            return createUpdateProgress({
                goalId: values.goalId,
                updatedValue: values.updatedValue,
                updateDate: values.updateDate,
                comment: values.comment,
            } as UpdateProgress);
        },
        onError: (error: Error) => {
            setError(error.message);
        },
        onSuccess: () => {
            setOpen(false);
            refetch();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => {
            if (!values.id) {
                throw new Error('ID is required for updating an objective');
            }
            return updateUpdateProgress({
                id: values.id,
                goalId: Number(values.goalId),
                updatedValue: values.updatedValue,
                updateDate: values.updateDate,
                comment: values.comment,
            });
        },
        onError: (error: Error) => {
            setError(error.message);
        },
        onSuccess: () => {
            setUpdateOpen(false);
            refetch();
        },
    });

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

    if (isLoading || isLoadingObjetive) {
        return <div>Loading...</div>;
    }

    if (!data || !objetiveData) {
        return <div>No data</div>;
    }

    function onSubmit(values: z.infer<typeof schema>) {
        mutation.mutate(values);
    }

    function onUpdateSubmit(values: z.infer<typeof schema>) {
        updateMutation.mutate(values);
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
