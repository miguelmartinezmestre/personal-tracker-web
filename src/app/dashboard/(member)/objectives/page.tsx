import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';
import ObjetivesTable from '@/components/objectives/objetives-table';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';

export default async function Objectives() {

    const queryClient = getQueryClient()
    const t = await getTranslations('Objectives');

    prefetch(trpc.objectives.getObjectivesByUser.queryOptions({}));
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateObjectiveFormModal />
            </div>
            <ObjetivesTable />
        </HydrationBoundary>
    );
}
