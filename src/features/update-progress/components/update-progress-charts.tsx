'use client';

import { ObjectiveProgressGraph } from '@/features/objectives/components/objective-graph';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { ChartDataTable } from '@/components/chart-data-table';
import { formatCivilDate } from '@/lib/format-date';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import type { ProgressPoint } from '../lib/progress-points';

const ObjectiveProgressTimeline = dynamic(() => import('./objective-progress-timeline'), {
    ssr: false,
});

type UpdateProgressChartsProps = {
    progressData: ProgressPoint[];
    isTruncated: boolean;
    objectiveDoc: ObjectiveWithCapabilities | null;
    lastUpdated: number | null;
};

export function UpdateProgressCharts({
    progressData,
    isTruncated,
    objectiveDoc,
    lastUpdated,
}: UpdateProgressChartsProps) {
    const t = useTranslations('UpdateProgress');
    const objectiveLabels = useTranslations('Objectives');
    const locale = useLocale();
    if (progressData.length === 0 || !objectiveDoc) {
        return null;
    }

    const unit = objectiveDoc.unit;
    const targetValue = objectiveDoc.targetValue;
    const startValue = objectiveDoc.startValue;

    return (
        <>
            {isTruncated ? (
                <p role="status" className="text-sm text-muted-foreground">
                    {t('historyLimited')}
                </p>
            ) : null}
            <ObjectiveProgressGraph
                data={progressData}
                currentValue={objectiveDoc.currentValue}
                unit={unit}
                targetValue={targetValue}
                startValue={startValue}
                lastUpdated={lastUpdated}
            />
            {progressData.length >= 2 ? (
                <ObjectiveProgressTimeline
                    data={progressData}
                    unit={unit}
                    targetValue={targetValue}
                />
            ) : null}
            <ChartDataTable
                caption={objectiveDoc.title}
                columns={[
                    t('table.columns.date'),
                    objectiveLabels('currentValue'),
                    objectiveLabels('targetValue'),
                ]}
                rows={progressData.map((point, index) => ({
                    id: `${point.date}/${index}`,
                    values: [
                        formatCivilDate(point.date, locale),
                        point.currentValue,
                        point.objective,
                    ],
                }))}
            />
        </>
    );
}
