'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@repo/ui/components/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { Progress as ProgressBar } from '@repo/ui/components/progress';

type ObjectiveProgressPoint = {
    date: number;
    currentValue: number;
    objective: number;
};

interface ObjectiveProgressGraphProps {
    data: ObjectiveProgressPoint[];
    unit?: string | null;
    targetValue?: number | null;
    period?: string | null;
    periodRange?: { start: number; end: number } | null;
    lastUpdated?: number | null;
    deadline?: number | null;
    updates?: { date: number; value: number }[];
    title?: string;
    description?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function ObjectiveProgressGraph({
    data,
    unit,
    targetValue,
    period,
    periodRange,
    lastUpdated,
    title,
    description,
}: ObjectiveProgressGraphProps) {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const numberFormatter = React.useMemo(
        () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
        []
    );
    const longDateFormatter = React.useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        []
    );

    const latestValue = data.length > 0 ? data[data.length - 1].currentValue : 0;
    const objectiveValue = targetValue ?? data[data.length - 1]?.objective ?? 0;
    const progressPercent =
        objectiveValue > 0 ? Math.round((latestValue / objectiveValue) * 100) : 0;
    const progressBarValue = clamp(progressPercent, 0, 100);

    const formatValue = (value: number) =>
        `${numberFormatter.format(value)}${unit ? ` ${unit}` : ''}`;
    const periodLabel =
        period && (period === 'weekly' || period === 'monthly' || period === 'custom')
            ? tObjectives(`periodOptions.${period}`)
            : null;
    const shortDateFormatter = React.useMemo(
        () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
        []
    );
    const periodRangeLabel = periodRange
        ? `${shortDateFormatter.format(new Date(periodRange.start))} - ${shortDateFormatter.format(
              new Date(periodRange.end - 1)
          )}`
        : null;

    const descriptionText =
        description ??
        `${tObjectives('targetValue')}: ${formatValue(objectiveValue)}${
            periodLabel ? ` (${periodLabel})` : ''
        }`;

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
                <CardDescription>{title ?? tObjectives('progress')}</CardDescription>
                <CardDescription>{descriptionText}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <ProgressBar value={progressBarValue} className="h-2" />
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
                        {periodLabel ? (
                            <span>
                                {tObjectives('period')}: {periodLabel}
                            </span>
                        ) : null}
                    </div>
                    {periodLabel && periodRangeLabel ? (
                        <div className="text-xs text-muted-foreground">{periodRangeLabel}</div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
