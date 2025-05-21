import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';
import ObjetivesTable from '@/components/objectives/objetives-table';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

export default async function Objectives() {

    const queryClient = getQueryClient()

    prefetch(trpc.objectives.getObjectivesByUser.queryOptions({}));
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Objectives </h1>
                <CreateObjectiveFormModal />
            </div>
            <ObjetivesTable />
        </HydrationBoundary>
    );
}
