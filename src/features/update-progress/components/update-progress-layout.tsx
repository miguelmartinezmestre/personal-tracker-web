'use client';

import type { Id } from '@/convex/_generated/dataModel';
import { requiredRouteParam } from '@/features/lib/route-param';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvexAuth } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useActiveMember } from '@/features/organizations/hooks/use-active-organization';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import CreateUpdateProgressFormModal from './update-progress-form-create-modal';
import UpdateProgressTable from './update-progress-table';
import { ObjectiveProgressSummary } from './objective-progress-summary';
export default function UpdateProgressLayout() {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const { isAuthenticated } = useConvexAuth();
    const { data: activeMember } = useActiveMember();
    const params = useParams();
    const objectiveId = requiredRouteParam(params.id) as Id<'objectives'>;
    const objectiveQuery = useQuery({
        ...convexQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        enabled: isAuthenticated,
    });
    const { data: objective } = objectiveQuery;
    if (objectiveQuery.isError) {
        return (
            <div className="w-full min-w-0 space-y-6">
                <QueryErrorFallback
                    onRetry={() => {
                        void objectiveQuery.refetch();
                    }}
                />
            </div>
        );
    }
    return (
        <div className="w-full min-w-0 space-y-6" data-testid="objective-progress-layout">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {tObjectives('objectiveProgress')}
                    </h1>
                    <p className="text-muted-foreground">{tUpdateProgress('pageDescription')}</p>
                    <ObjectiveProgressSummary
                        title={objective?.title ?? ''}
                        description={objective?.description?.trim() ?? ''}
                        unitLabel={objective?.unit ?? ''}
                        targetValue={objective?.targetValue}
                        currentValue={objective?.currentValue}
                    />
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
