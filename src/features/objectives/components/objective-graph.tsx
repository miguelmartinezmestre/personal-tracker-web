'use client';

import { TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { computeObjectiveProgressPercent } from './objectives-utils';

interface ObjectiveProgressGraphProps {
    currentValue: number;
    unit: string | null | undefined;
    targetValue: number;
    startValue: number;
    lastUpdated: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function ObjectiveProgressGraph({
    currentValue,
    unit,
    targetValue,
    startValue,
    lastUpdated,
}: ObjectiveProgressGraphProps) {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const locale = useLocale();
    const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const longDateFormatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });

    const latestValue = currentValue;
    const objectiveValue = targetValue;
    const progressPercent = Math.round(
        computeObjectiveProgressPercent({
            currentValue: latestValue,
            targetValue: objectiveValue,
            startValue,
        })
    );
    const progressBarValue = clamp(progressPercent, 0, 100);

    const formatValue = (value: number) =>
        `${numberFormatter.format(value)}${unit ? ` ${unit}` : ''}`;
    const descriptionText = `${tObjectives('targetValue')}: ${formatValue(objectiveValue)}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl tracking-tight">{formatValue(latestValue)}</span>
                    <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{progressPercent}%</span>
                    </Badge>
                </CardTitle>
                <CardDescription>{tObjectives('progress')}</CardDescription>
                <CardDescription>{descriptionText}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <ProgressBar
                        aria-label={tObjectives('progress')}
                        value={progressBarValue}
                        className="h-2"
                    />
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>
                            {tObjectives('currentValue')}: {formatValue(latestValue)}
                        </span>
                        <span>
                            {tObjectives('targetValue')}: {formatValue(objectiveValue)}
                        </span>
                        {lastUpdated ? (
                            <span>
                                {tUpdateProgress('table.columns.date')}:{' '}
                                {longDateFormatter.format(new Date(lastUpdated))}
                            </span>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
