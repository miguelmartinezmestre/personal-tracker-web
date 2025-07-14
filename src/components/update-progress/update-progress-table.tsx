'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { getQueryClient } from '@/trpc/client';
import { UpdateProgress } from '@/schemas/update-progress';
import { ObjectiveProgressOverTimeGraph, Progress } from '@/components/objective-progress-over-time-graph';
import UpdateProgressFormModal from '@/components/update-progress/update-progress-form-edit-modal';
import { useParams } from 'next/navigation';

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
            {progressData.length > 0 && <ObjectiveProgressOverTimeGraph data={progressData} />}
            <DataTable columns={columns} data={updateProgress.data!} isLoading={updateProgress.isLoading} />
        </div>
    );
}
