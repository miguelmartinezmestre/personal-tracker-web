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
import { Doc, Id } from '../../../convex/_generated/dataModel';

export default function UpdateProgressTable() {
    const { id: objectiveId } = useParams();
    const updateProgress = useSuspenseQuery(convexQuery(api.update_progress.getUpdateProgressByObjectiveId, { objective: objectiveId as any }));
    const objective = useSuspenseQuery(convexQuery(api.objectives.getObjectiveById, { id: objectiveId as any }));
    const deleteUpdateProgress = useMutation({ mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress) });

    const columns: ColumnDef<Doc<"progressUpdates">>[] = [
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
                const defaultValues = {
                    _id: String(objetiveRow._id),
                    updatedValue: objetiveRow.updatedValue,
                    updateDate: new Date(objetiveRow.updateDate),
                    comment: objetiveRow.comment ?? null,
                } as unknown as UpdateProgress;
                return (
                    <UpdateProgressFormModal defaultValues={defaultValues} />
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
                            await deleteUpdateProgress.mutateAsync({ id: objetiveRow._id as Id<"progressUpdates"> });
                        }}
                    >
                        Delete
                    </Button>
                );
            },
        },
    ];

    type ProgressPoint = { date: string; currentValue: number; objective: number };
    const progressData: ProgressPoint[] = (updateProgress.data ?? []).map((item: Doc<"progressUpdates">) => ({
        date: new Date(item.updateDate).toISOString(),
        currentValue: item.updatedValue,
        objective: (objective.data as Doc<"objectives"> | undefined)?.targetValue ?? 0,
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
