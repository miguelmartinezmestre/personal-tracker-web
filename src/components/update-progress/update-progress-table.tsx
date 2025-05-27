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
import EditObjectiveFormModal from './update-progress-form-edit-modal';
import { getQueryClient } from '@/trpc/client';
import { UpdateProgress } from '@/schemas/update-progress';
import { Graph3, Progress } from '../graph3';
import UpdateProgressFormModal from './update-progress-form-edit-modal';
import { useParams } from 'next/navigation';

function t(key: string) {
    return key;
}

export default function UpdateProgressTable() {
    const {id: objectiveId} = useParams();
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const updateProgress = useSuspenseQuery(trpc.updateProgress.getUpdateProgressByObjectiveId.queryOptions({ id: Number(objectiveId) }));
    const objective = useSuspenseQuery(trpc.objectives.getObjectiveById.queryOptions({ id: Number(objectiveId) }));
    const deleteUpdateProgress = useMutation(trpc.updateProgress.deleteUpdateProgress.mutationOptions());

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
                    <UpdateProgressFormModal defaultValues={objetiveRow} />
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
                        onClick={async () => {
                            await deleteUpdateProgress.mutateAsync({ id: objetiveRow.id });
                            queryClient.invalidateQueries(trpc.updateProgress.getUpdateProgressByObjectiveId.queryOptions({ id: Number(objectiveId) }));
                        }}
                    >
                        Delete
                    </Button>
                );
            },
        },
    ];

    const progressData: Progress[] = updateProgress.data!.map(item => ({
        date: new Date(item.updateDate),
        currentValue: item.updatedValue,
        objetive: objective.data!.targetValue,
    }));


    return (
        <div>
            {progressData.length > 0 && <Graph3 data={progressData} />}
            <DataTable columns={columns} data={updateProgress.data!} isLoading={updateProgress.isLoading} />
        </div>
    );
}
