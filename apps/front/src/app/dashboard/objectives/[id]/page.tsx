import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';
import UpdateProgressLayout from '@/features/update-progress/components/update-progress-layout';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const objectiveId = id as Id<'objectives'>;

    let preloadedProgressQuery: Preloaded<typeof api.update_progress.getUpdateProgressByObjectiveId>;
    let preloadedObjectiveQuery: Preloaded<typeof api.objectives.getObjectiveById>;

    try{
        [preloadedProgressQuery, preloadedObjectiveQuery] = await Promise.all([
            preloadAuthQuery(api.update_progress.getUpdateProgressByObjectiveId, {
                objectiveId,
                paginationOpts: { numItems: 20, cursor: null },
            }),
            preloadAuthQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        ]);
    }catch(error){
        console.error(error);
        redirect('/dashboard/home');
    }

    return (
        <UpdateProgressLayout
            preloadedProgressQuery={preloadedProgressQuery}
            preloadedObjectiveQuery={preloadedObjectiveQuery}
        />
    );
}
