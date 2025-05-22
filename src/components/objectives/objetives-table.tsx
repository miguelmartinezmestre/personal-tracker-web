'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
    Objective,
} from '@/schemas/objective';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditObjectiveFormModal from './objective-form-edit-modal';
import { getQueryClient } from '@/trpc/client';

function t(key: string) {
    return key;
}

export default function ObjetivesTable() {
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const objectives = useSuspenseQuery(trpc.objectives.getObjectivesByUser.queryOptions({}));
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
                    <EditObjectiveFormModal defaultValues={objetiveRow} />
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
                            await queryClient.invalidateQueries(
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
                        <Link href={`/dashboard/objectives/${objetiveRow.id}`} prefetch={true}>Ir actividad</Link>
                    );
                }

                return null;
            },
        },
    ];

    

    

    return (
        <div>
            <DataTable columns={columns} data={objectives.data!} isLoading={objectives.isLoading} />
        </div>
    );
}
