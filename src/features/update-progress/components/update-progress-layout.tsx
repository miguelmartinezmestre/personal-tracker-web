'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@/convex/_generated/api';
import CreateUpdateProgressFormModal from './update-progress-form-create-modal';
import UpdateProgressTable from './update-progress-table';

interface UpdateProgressLayoutProps {
    preloadedProgressQuery: Preloaded<typeof api.update_progress.getUpdateProgressByObjectiveId>;
    preloadedObjectiveQuery: Preloaded<typeof api.objectives.getObjectiveById>;
}

export default function UpdateProgressLayout({
    preloadedProgressQuery,
    preloadedObjectiveQuery,
}: UpdateProgressLayoutProps) {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const progress = usePreloadedAuthQuery(preloadedProgressQuery);
    const objective = usePreloadedAuthQuery(preloadedObjectiveQuery);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {tObjectives('objectiveProgress')}
                    </h1>
                    <p className="text-muted-foreground">{tUpdateProgress('pageDescription')}</p>
                </div>
                <CreateUpdateProgressFormModal />
            </div>

            <UpdateProgressTable
                initialProgress={progress ?? undefined}
                initialObjective={objective ?? undefined}
            />
        </div>
    );
}
