'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { UpdateProgress } from '@/schemas/update-progress';
import ObjectiveProgressOverTimeChart from '@/components/objective-progress-over-time-graph';
import UpdateProgressFormModal from '@/components/update-progress/update-progress-form-edit-modal';
import { useParams } from 'next/navigation';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

export default function UpdateProgressTable() {
    const { id: objectiveId } = useParams();
    const updateProgress = useSuspenseQuery(convexQuery(api.update_progress.getUpdateProgressByObjectiveId, { objective: objectiveId as any }));
    const objective = useSuspenseQuery(convexQuery(api.objectives.getObjectiveById, { id: objectiveId as any }));
    const deleteUpdateProgress = useMutation({ mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress) });

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
                            await deleteUpdateProgress.mutateAsync({ id: objetiveRow.id as any });
                        }}
                    >
                        Delete
                    </Button>
                );
            },
        },
    ];

    const progressData: Progress[] = (updateProgress.data ?? []).map((item: any) => ({
        date: new Date(item.updateDate),
        currentValue: item.updatedValue,
        objetive: (objective.data as any)?.targetValue,
    }));


    return (
        <div>
            {progressData.length > 0 && <div className="p-4 border rounded-lg bg-background">
                <ObjectiveProgressOverTimeChart data={progressData} />
            </div>}

            <DataTable columns={columns} data={updateProgress.data!} isLoading={updateProgress.isLoading} />
        </div>
    );
}
