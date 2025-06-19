import UpdateProgressTable from '@/components/update-progress/update-progress-table';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import CreateUpdateProgressFormModal from '@/components/update-progress/update-progress-form-create-modal';

export default async function Objective({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const queryClient = getQueryClient()

    prefetch(trpc.objectives.getObjectiveById.queryOptions({ id: Number(id) }));

    return (
        <>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Objectives </h1>
                    <CreateUpdateProgressFormModal />
                </div>
                <UpdateProgressTable />
            </HydrationBoundary>
        </>
    );
}