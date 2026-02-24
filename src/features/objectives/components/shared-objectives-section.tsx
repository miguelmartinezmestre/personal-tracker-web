'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { computeObjectiveProgressPercent } from './objectives-utils';
import type { Doc } from '@/convex/_generated/dataModel';

export function SharedObjectivesSection() {
    const t = useTranslations('Objectives');
    const tCollab = useTranslations('Objectives.collaboration');

    const { data: sharedObjectives } = useQuery(
        convexQuery(api.objectives.getSharedObjectives, {
            paginationOpts: { numItems: 100, cursor: null },
        })
    );

    const statusLabels = {
        completed: t('statusLabels.completed'),
        overdue: t('statusLabels.overdue'),
        onTrack: t('statusLabels.onTrack'),
        inProgress: t('statusLabels.inProgress'),
        atRisk: t('statusLabels.atRisk'),
        paused: t('statusLabels.paused'),
        archived: t('statusLabels.archived'),
        deleted: t('statusLabels.deleted'),
    };

    const objectives = sharedObjectives?.page ?? [];

    if (objectives.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">{tCollab('sharedObjectives')}</h2>
                <Badge variant="secondary">{objectives.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{tCollab('sharedDescription')}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {objectives.map((objective: Doc<'objectives'>) => {
                    const progress = computeObjectiveProgressPercent({
                        currentValue: objective.currentValue ?? 0,
                        targetValue: objective.targetValue ?? 0,
                        startValue: objective.startValue ?? null,
                        direction: objective.direction ?? 'increase',
                    });
                    return (
                        <Card key={objective._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-sm leading-tight truncate">
                                        {objective.title}
                                    </h3>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                        {tCollab('sharedBadge')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <CircularProgress value={progress} max={100} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-muted-foreground">
                                            {objective.currentValue ?? 0} /{' '}
                                            {objective.targetValue ?? 0} {objective.unit || ''}
                                        </div>
                                        <StatusIndicator
                                            status={objective.status ?? 'active'}
                                            deadline={objective.deadline ?? undefined}
                                            currentValue={objective.currentValue ?? 0}
                                            targetValue={objective.targetValue ?? 0}
                                            startValue={objective.startValue ?? undefined}
                                            direction={objective.direction ?? undefined}
                                            labels={statusLabels}
                                        />
                                    </div>
                                </div>
                                <Link
                                    href={`/dashboard/objectives/${String(objective._id)}`}
                                    className="flex items-center text-primary hover:text-primary/80 text-sm font-medium group/link"
                                    prefetch={false}
                                >
                                    {t('goToProgress')}
                                    <ChevronRight className="h-3 w-3 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
                                </Link>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
