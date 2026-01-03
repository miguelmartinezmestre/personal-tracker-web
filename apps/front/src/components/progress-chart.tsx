'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@repo/ui/components/chart';
import type { ChartConfig } from '@repo/ui/components/chart';
import { Progress as ProgressBar } from '@repo/ui/components/progress';
import { useTranslations } from 'next-intl';

export type Progress = {
    date: number;
    currentValue: number;
    objective: number;
};

interface ProgressChartProps {
    data: Progress[];
    title?: string;
    description?: string;
    unit?: string | null;
    targetValue?: number | null;
    period?: string | null;
    periodRange?: { start: number; end: number } | null;
    lastUpdated?: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const coerceTimestamp = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return value.getTime();
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return null;
};

export default function ProgressChart({
    data,
    title,
    description,
    unit,
    targetValue,
    period,
    periodRange,
    lastUpdated,
}: ProgressChartProps) {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');
    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
        []
    );
    const shortDateFormatter = useMemo(
        () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
        []
    );
    const longDateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        []
    );

    const latestPoint = data.length > 0 ? data[data.length - 1] : undefined;
    const objectiveValue = targetValue ?? latestPoint?.objective ?? 0;
    const currentValue = latestPoint?.currentValue ?? 0;
    const progressPercent =
        objectiveValue > 0 ? Math.round((currentValue / objectiveValue) * 100) : 0;
    const progressBarValue = clamp(progressPercent, 0, 100);

    const formatValue = (value: number) =>
        `${numberFormatter.format(value)}${unit ? ` ${unit}` : ''}`;
    const periodLabel =
        period && (period === 'weekly' || period === 'monthly' || period === 'custom')
            ? tObjectives(`periodOptions.${period}`)
            : null;
    const periodRangeLabel = periodRange
        ? `${shortDateFormatter.format(new Date(periodRange.start))} - ${shortDateFormatter.format(
              new Date(periodRange.end - 1)
          )}`
        : null;

    const chartConfig = {
        currentValue: {
            label: `${tObjectives('currentValue')}${unit ? ` (${unit})` : ''}`,
            color: 'oklch(var(--chart-1))',
        },
        objective: {
            label: `${tObjectives('targetValue')}${unit ? ` (${unit})` : ''}`,
            color: 'oklch(var(--chart-2))',
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title ?? tObjectives('progress')}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {tObjectives('progress')}
                            </p>
                            <p className="text-3xl font-semibold tabular-nums">
                                {progressPercent}%
                            </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formatValue(currentValue)} / {formatValue(objectiveValue)}
                        </div>
                    </div>
                    <ProgressBar value={progressBarValue} className="h-2" />
                    <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-muted-foreground">{tObjectives('currentValue')}</p>
                            <p className="font-medium tabular-nums">{formatValue(currentValue)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{tObjectives('targetValue')}</p>
                            <p className="font-medium tabular-nums">
                                {formatValue(objectiveValue)}
                            </p>
                        </div>
                        {lastUpdated ? (
                            <div>
                                <p className="text-muted-foreground">
                                    {tUpdateProgress('table.columns.date')}
                                </p>
                                <p className="font-medium">
                                    {longDateFormatter.format(new Date(lastUpdated))}
                                </p>
                            </div>
                        ) : null}
                        {periodLabel && periodRangeLabel ? (
                            <div>
                                <p className="text-muted-foreground">{tObjectives('period')}</p>
                                <p className="font-medium">{periodLabel}</p>
                                <p className="text-xs text-muted-foreground">{periodRangeLabel}</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={value => {
                                const timestamp = coerceTimestamp(value);
                                return timestamp
                                    ? shortDateFormatter.format(new Date(timestamp))
                                    : String(value ?? '');
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={value => numberFormatter.format(value as number)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                            labelFormatter={value => {
                                const timestamp = coerceTimestamp(value);
                                return timestamp
                                    ? longDateFormatter.format(new Date(timestamp))
                                    : String(value ?? '');
                            }}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line
                            type="monotone"
                            dataKey="objective"
                            stroke="var(--color-objective)"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="currentValue"
                            stroke="var(--color-currentValue)"
                            strokeWidth={3}
                            dot={{
                                r: 4,
                                fill: 'var(--color-currentValue)',
                                strokeWidth: 2,
                                stroke: 'hsl(var(--background))',
                            }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
