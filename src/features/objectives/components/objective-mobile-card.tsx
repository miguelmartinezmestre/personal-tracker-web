'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { computeObjectiveProgressPercent } from './objectives-utils';
import { ObjectiveRowActions } from './objective-row-actions';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';

type StatusLabels = {
    active: string;
    completed: string;
    overdue: string;
};

type ObjectiveMobileCardProps = {
    objective: ObjectiveWithCapabilities;
    categoryNameById: Map<string, string>;
    statusLabels: StatusLabels;
    onEdit: (objectiveId: ObjectiveWithCapabilities['_id']) => void;
};

export function ObjectiveMobileCard({
    objective,
    categoryNameById,
    statusLabels,
    onEdit,
}: ObjectiveMobileCardProps) {
    const locale = useLocale();
    const t = useTranslations('Objectives');
    const progress = computeObjectiveProgressPercent({
        currentValue: objective.currentValue,
        targetValue: objective.targetValue,
        startValue: objective.startValue,
    });
    const categoryName = objective.categoryId
        ? categoryNameById.get(objective.categoryId)
        : undefined;

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{objective.title}</p>
                        {objective.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {objective.description}
                            </p>
                        ) : null}
                    </div>
                    <StatusIndicator
                        status={objective.status}
                        deadline={objective.deadline ?? undefined}
                        labels={statusLabels}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                    <CircularProgress
                        aria-label={`${t('progress')}: ${objective.title}`}
                        value={progress}
                    />
                    <div className="text-sm text-muted-foreground">
                        {objective.currentValue}/{objective.targetValue} {objective.unit ?? ''}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {categoryName ? <Badge variant="secondary">{categoryName}</Badge> : null}
                    {objective.deadline ? (
                        <Badge variant="outline">
                            {formatCivilDate(objective.deadline, locale)}
                        </Badge>
                    ) : null}
                </div>

                <ObjectiveRowActions objective={objective} onEdit={onEdit} />
            </CardContent>
        </Card>
    );
}
