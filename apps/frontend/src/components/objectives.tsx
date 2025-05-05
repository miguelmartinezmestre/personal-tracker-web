import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Objetive } from '../models/objetive';
import { useAuthContext } from '../providers/auth-provider';
import { schema } from '../schemas/objective';
import {
    useDeleteObjectiveMutation,
    useObjectiveMutation,
    useUpdateObjectiveMutation,
} from '../services/mutations/objective';
import { useObjectivesQuery } from '../services/queries/objectives';
import { GenericForm } from './generic-form';
import { Modal } from './modal';
import { DataTable } from './table';
import { Button } from './ui/button';
import { Link } from '@tanstack/react-router';

const defaultValues = {
    title: 'a',
    description: 'a',
    category: 'a',
    targetValue: 0,
    currentValue: 0,
    deadline: new Date(),
    status: 'aa',
    unit: 'a',
};

export default function Objectives() {
    const { t } = useTranslation();
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const [, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState<z.infer<typeof schema>>(defaultValues);

    const { data, refetch, isLoading } = useObjectivesQuery(user.id);

    const { mutation } = useObjectiveMutation(user.id, setError, setOpen, refetch);

    const { updateMutation } = useUpdateObjectiveMutation(
        user.id,
        setError,
        setUpdateOpen,
        refetch
    );

    const { mutation: deleteMutation } = useDeleteObjectiveMutation(setError, setOpen, refetch);

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
        {
            header: '',
            id: 'update-objective',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={() => {
                            setUpdateOpen(true);
                            setUpdateValues(objetiveRow);
                        }}
                    >
                        Editar Objetivo
                    </Button>
                );
            },
        },
        {
            header: '',
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
        {
            header: '',
            id: 'go-to-activity',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                if (objetiveRow.id) {
                    return (
                        <Link
                            to="/dashboard/objectives/$id"
                            params={{ id: String(objetiveRow.id) }}
                        >
                            Ir actividad
                        </Link>
                    );
                }

                return null;
            },
        },
    ];

    if (isLoading || isLoadingAuth) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return <div>No data</div>;
    }

    function onSubmit(values: z.infer<typeof schema>) {
        mutation.mutate(values);
    }

    function onUpdateSubmit(values: z.infer<typeof schema>) {
        updateMutation.mutate(values);
    }

    return (
        <>
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
                title={t('title')}
                description="Create a new objetive"
                isOpen={open}
                onOpenChange={setOpen}
                buttonText="Crear Objetivo"
                buttonHidden={false}
            >
                <GenericForm schema={schema} defaultValues={defaultValues} onSubmit={onSubmit} />
            </Modal>
            <DataTable columns={columns} data={data} />
        </>
    );
}
