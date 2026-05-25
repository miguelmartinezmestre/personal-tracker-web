import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { UpdateProgressLayout } from '@/features/update-progress';
import { Id } from '@/convex/_generated/dataModel';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
        redirect('/dashboard/objectives');
    }
    const objectiveId = id as Id<'objectives'>;

    let preloadedProgressQuery: Preloaded<
        typeof api.update_progress.getUpdateProgressByObjectiveId
    >;
    let preloadedObjectiveQuery: Preloaded<typeof api.objectives.getObjectiveById>;

    try {
        [preloadedProgressQuery, preloadedObjectiveQuery] = await Promise.all([
            preloadAuthQuery(api.update_progress.getUpdateProgressByObjectiveId, {
                objectiveId,
                paginationOpts: { numItems: 20, cursor: null },
            }),
            preloadAuthQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        ]);
    } catch {
        redirect('/dashboard/home');
    }

    return (
        <UpdateProgressLayout
            preloadedProgressQuery={preloadedProgressQuery}
            preloadedObjectiveQuery={preloadedObjectiveQuery}
        />
    );
}
