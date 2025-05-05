import { useParams } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { z } from 'zod';
import { UpdateProgress } from '../models/update-progress';
import { useAuthContext } from '../providers/auth-provider';
import { schema } from '../schemas/update-progress';
import {
    useDeleteUpdateProgressMutation,
    useUpdateProgressMutation,
    useUpdateUpdateProgressMutation,
} from '../services/mutations/update-progress';
import { useObjectiveQuery } from '../services/queries/objective';
import { useUpdateProgressQuery } from '../services/queries/update-progress';
import { GenericForm } from './generic-form';
import { Progress, Graph3 } from './graph3';
import { Modal } from './modal';
import { DataTable } from './table';
import { Button } from './ui/button';

export default function Objective() {
    const { id } = useParams({ strict: false });

    const defaultValues = {
        goalId: Number(id),
        updatedValue: 0,
        updateDate: new Date(),
        comment: '',
    };

    const { user, isLoading: isLoadingAuth } = useAuthContext();
    const [open, setOpen] = useState(false);
    const [, setError] = useState<string>('');
    const [updateOpen, setUpdateOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState<UpdateProgress>(defaultValues);

    const { data, refetch, isLoading } = useUpdateProgressQuery(user.id, Number(id));

    const { data: objetiveData, isLoading: isLoadingObjetive } = useObjectiveQuery(
        user.id,
        Number(id)
    );

    const { mutation } = useUpdateProgressMutation(setError, setOpen, refetch);

    const { mutation: deleteMutation } = useDeleteUpdateProgressMutation(
        setError,
        setOpen,
        refetch
    );
    const { mutation: updateMutation } = useUpdateUpdateProgressMutation(
        setError,
        setUpdateOpen,
        refetch
    );

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
        {
            header: 'Edit',
            id: 'edit',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={() => {
                            setUpdateOpen(true);
                            setUpdateValues(objetiveRow);
                        }}
                    >
                        Editar Update Progress
                    </Button>
                );
            },
        },
        {
            header: 'Delete',
            id: 'delete',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={() => {
                            deleteMutation.mutate(Number(objetiveRow.id));
                        }}
                    >
                        Delete
                    </Button>
                );
            },
        },
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
                title="Update progress"
                description="Update the progress of the objetive"
                isOpen={updateOpen}
                onOpenChange={setUpdateOpen}
                buttonHidden={true}
            >
                <GenericForm
                    schema={schema}
                    defaultValues={updateValues}
                    onSubmit={onUpdateSubmit}
                />
            </Modal>

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
