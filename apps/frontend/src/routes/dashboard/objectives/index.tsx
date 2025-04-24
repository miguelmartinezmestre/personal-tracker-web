import { createFileRoute, Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { z } from 'zod';
import { GenericForm } from '../../../components/generic-form';
import { Modal } from '../../../components/modal';
import { DataTable } from '../../../components/table';
import { Button } from '../../../components/ui/button';
import { Objetive } from '../../../models/objetive';
import { useAuthContext } from '../../../providers/auth-provider';
import { useTranslation } from 'react-i18next';
import { useObjectivesQuery } from '../../../services/queries/objectives';
import { schema } from '../../../schemas/objective';
import {
    useObjectiveMutation,
    useUpdateObjectiveMutation,
} from '../../../services/mutations/objective';

export const Route = createFileRoute('/dashboard/objectives/')({
    component: RouteComponent,
});

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

function RouteComponent() {
    const { t } = useTranslation();
    const { user, isLoading: isLoadingAuth } = useAuthContext();

    const [, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState<z.infer<typeof schema>>(defaultValues);

    const { data, refetch, isLoading } = useObjectivesQuery(user?.id ?? 0);

    const { mutation } = useObjectiveMutation(user?.id ?? 0, setError, setOpen, refetch);

    const { updateMutation } = useUpdateObjectiveMutation(
        user?.id ?? 0,
        setError,
        setUpdateOpen,
        refetch
    );

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
            header: 'Editar Objetivo',
            id: 'update-progress',
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
            header: 'Ir actividad',
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
