'use client';

import { DataTable } from '@/components/table';
import { browserQueryClient, useTRPC } from '@/trpc/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
    CreateObjective,
    Objective,
} from '@/schemas/objective';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditObjectiveFormModal from './objective-form-edit-modal';
import CreateObjectiveFormModal from './objective-form-create-modal';

function t(key: string) {
    return key;
}

const defaultValues: CreateObjective = {
    title: '',
    description: '',
    category: null,
    targetValue: 0,
    currentValue: 0,
    deadline: null,
    status: 'not_started',
    unit: '',
};

export default function ObjetivesTable() {
    const trpc = useTRPC();

    const objectives = useQuery(trpc.objectives.getObjectivesByUser.queryOptions({}));
    const createObjective = useMutation(trpc.objectives.createObjective.mutationOptions());
    const updateObjective = useMutation(trpc.objectives.updateObjective.mutationOptions());
    const deleteObjective = useMutation(trpc.objectives.deleteObjective.mutationOptions());

    const columns: ColumnDef<Objective>[] = [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            accessorKey: 'description',
            header: t('description'),
        },
        {
            accessorKey: 'targetValue',
            header: t('targetValue'),
        },
        {
            accessorKey: 'currentValue',
            header: t('currentValue'),
        },
        {
            accessorKey: 'deadline',
            header: t('deadline'),
            cell: ({ row }) => {
                const objective = row.original;
                return objective.deadline ? new Date(objective.deadline).toLocaleDateString() : '';
            },
        },
        {
            accessorKey: 'status',
            header: t('status'),
        },
        {
            header: '',
            id: 'update-objective',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <EditObjectiveFormModal onSubmitFn={onUpdateSubmit} defaultValues={objetiveRow} />
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
                        onClick={async () => {
                            await deleteObjective.mutateAsync({ id: objetiveRow.id });
                            await browserQueryClient.invalidateQueries(
                                trpc.objectives.getObjectivesByUser.queryOptions({})
                            );
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
                        <Link href={`/dashboard/objectives/${objetiveRow.id}`}>Ir actividad</Link>
                    );
                }

                return null;
            },
        },
    ];

    const onSubmit = async (values: CreateObjective) => {
        await createObjective.mutateAsync(values);

        browserQueryClient.invalidateQueries(trpc.objectives.getObjectivesByUser.queryOptions({}));
    };

    const onUpdateSubmit = async (values: Objective) => {
        const updateData = {
            id: values.id,
            title: values.title,
            description: values.description ?? undefined,
            category: values.category ?? undefined,
            targetValue: values.targetValue,
            currentValue: values.currentValue,
            deadline: values.deadline ?? undefined,
        };

        await updateObjective.mutateAsync(updateData);

        browserQueryClient.invalidateQueries(trpc.objectives.getObjectivesByUser.queryOptions({}));
    };

    return (
        <div>
            <CreateObjectiveFormModal onSubmitFn={onSubmit} defaultValues={defaultValues} />
            <DataTable columns={columns} data={objectives.data!} isLoading={objectives.isLoading} />
        </div>
    );
}
