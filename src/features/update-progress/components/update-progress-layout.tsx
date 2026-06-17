'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvexAuth } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useActiveMember } from '@/features/organizations/hooks/use-active-organization';
import { Id } from '@/convex/_generated/dataModel';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import CreateUpdateProgressFormModal from './update-progress-form-create-modal';
import UpdateProgressTable from './update-progress-table';

export default function UpdateProgressLayout() {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const { isAuthenticated } = useConvexAuth();
    const { data: activeMember } = useActiveMember();

    const params = useParams();
    const objectiveIdParam = params.id;
    const rawObjectiveId = Array.isArray(objectiveIdParam) ? objectiveIdParam[0] : objectiveIdParam;

    if (!rawObjectiveId || typeof rawObjectiveId !== 'string') {
        throw new Error('Invalid objective ID');
    }

    const objectiveId = rawObjectiveId as Id<'objectives'>;

    const objectiveQuery = useQuery({
        ...convexQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        enabled: isAuthenticated,
    });
    const { data: objective } = objectiveQuery;

    if (objectiveQuery.isError) {
        return (
            <div className="w-full min-w-0 space-y-6">
                <QueryErrorFallback onRetry={() => objectiveQuery.refetch()} />
            </div>
        );
    }

    const objectiveTitle = objective?.title ?? '';
    const objectiveDescription = objective?.description?.trim() ?? '';
    const unitLabel = objective?.unit ?? '';
    const targetValue = objective?.targetValue;
    const currentValue = objective?.currentValue;
    const formatValue = (value: number) => (unitLabel ? `${value} ${unitLabel}` : `${value}`);

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="objective-progress-layout">
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
                    {objective?.capabilities.canContribute ? (
                        <CreateUpdateProgressFormModal />
                    ) : null}
                </div>
            </div>

            <UpdateProgressTable
                objective={objective ?? null}
                currentUserId={activeMember?.userId ?? null}
            />
        </div>
    );
}
