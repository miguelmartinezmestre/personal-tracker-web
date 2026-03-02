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
    const objectiveTitle = objective?.title ?? '';
    const objectiveDescription = objective?.description?.trim() ?? '';
    const unitLabel = objective?.unit ?? '';
    const targetValue = objective?.targetValue;
    const currentValue = objective?.currentValue;
    const formatValue = (value: number) => (unitLabel ? `${value} ${unitLabel}` : String(value));

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {tObjectives('objectiveProgress')}
                    </h1>
                    <p className="text-muted-foreground">{tUpdateProgress('pageDescription')}</p>
                    {objectiveTitle && (
                        <p className="text-lg font-semibold text-foreground">{objectiveTitle}</p>
                    )}
                    {(objectiveDescription ||
                        typeof targetValue === 'number' ||
                        typeof currentValue === 'number') && (
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {objectiveDescription ? (
                                <p>
                                    <span className="font-medium text-foreground">
                                        {tObjectives('tableDescription')}:
                                    </span>{' '}
                                    {objectiveDescription}
                                </p>
                            ) : null}
                            {(typeof targetValue === 'number' ||
                                typeof currentValue === 'number') && (
                                <div className="flex flex-wrap gap-4">
                                    {typeof targetValue === 'number' ? (
                                        <span>
                                            <span className="font-medium text-foreground">
                                                {tObjectives('targetValue')}:
                                            </span>{' '}
                                            {formatValue(targetValue)}
                                        </span>
                                    ) : null}
                                    {typeof currentValue === 'number' ? (
                                        <span>
                                            <span className="font-medium text-foreground">
                                                {tObjectives('currentValue')}:
                                            </span>{' '}
                                            {formatValue(currentValue)}
                                        </span>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <CreateUpdateProgressFormModal />
                </div>
            </div>

            <UpdateProgressTable
                initialProgress={progress ?? undefined}
                initialObjective={objective ?? undefined}
            />
        </div>
    );
}
