'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { areaY, defineChart, lineY, ruleY } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { paceStartDate } from '@/features/objectives/lib/dates';
import { formatObjectiveValue } from '@/features/objectives/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_HEIGHT = 280;
const DAY_MS = 24 * 60 * 60 * 1000;
const LINE_COLOR = 'var(--chart-2)';
const MUTED_COLOR = 'var(--muted-foreground)';

type ProgressChartObjective = {
    id: Id<'objectives'>;
    startValue: number;
    targetValue: number;
    createdAt: number;
    firstProgressAt?: number | undefined;
    deadline?: number;
    unit?: string;
};

type SeriesPoint = {
    key: string;
    kind: 'start' | 'update';
    date: number;
    value: number;
    delta?: number;
    comment?: string;
};

type PacePoint = { kind: 'pace'; date: number; value: number };

const TICK_STEP_DAYS = [1, 2, 7, 14, 30, 61, 91, 182];
const MAX_DATE_TICKS = 7;

const YEAR_TICKS_MIN_DAYS = 2 * 365;

function dayTicks(min: number, max: number): number[] {
    const first = Math.ceil(min / DAY_MS);
    const last = Math.floor(max / DAY_MS);

    const step =
        TICK_STEP_DAYS.find(days => (last - first) / days < MAX_DATE_TICKS) ??
        Math.ceil((last - first) / MAX_DATE_TICKS);

    const ticks: number[] = [];

    for (let day = first; day <= last; day += step) {
        ticks.push(day * DAY_MS);
    }

    return ticks;
}

function yearTicks(min: number, max: number): number[] {
    let firstYear = new Date(min).getUTCFullYear();

    if (Date.UTC(firstYear, 0, 1) < min) {
        firstYear++;
    }

    const lastYear = new Date(max).getUTCFullYear();
    const step = Math.max(1, Math.ceil((lastYear - firstYear + 1) / MAX_DATE_TICKS));
    const ticks: number[] = [];

    for (let year = firstYear; year <= lastYear; year += step) {
        ticks.push(Date.UTC(year, 0, 1));
    }

    return ticks;
}

function usesYearTicks(min: number, max: number): boolean {
    return (max - min) / DAY_MS >= YEAR_TICKS_MIN_DAYS;
}

function crossesYear(min: number, max: number): boolean {
    return new Date(min).getUTCFullYear() !== new Date(max).getUTCFullYear();
}

type HistoryPoint = {
    id: string;
    updateDate: number;
    value: number;
    delta: number;
    comment?: string;
};

function buildSeries(objective: ProgressChartObjective, points: readonly HistoryPoint[]) {
    const series: SeriesPoint[] = points.map(point => ({
        key: point.id,
        kind: 'update',
        date: point.updateDate,
        value: point.value,
        delta: point.delta,
        comment: point.comment,
    }));

    series.unshift({
        key: 'start',
        kind: 'start',
        // A truncated history lacks the oldest points, so prefer the objective's own first date.
        date: paceStartDate({
            createdAt: objective.createdAt,
            firstProgressAt: objective.firstProgressAt ?? points[0]?.updateDate,
        }),
        value: objective.startValue,
    });
    const startDate = series[0]?.date ?? objective.createdAt;

    const pace: PacePoint[] =
        objective.deadline !== undefined && objective.deadline > startDate
            ? [
                  { kind: 'pace', date: startDate, value: objective.startValue },
                  { kind: 'pace', date: objective.deadline, value: objective.targetValue },
              ]
            : [];

    return { series, pace };
}

export default function ProgressChart({ objective }: { objective: ProgressChartObjective }) {
    const t = useTranslations('Objectives.chart');
    const locale = useLocale();

    const history = useQuery(
        convexQuery(api.progress.getProgressHistory, { objectiveId: objective.id })
    );

    const points = history.data?.points;

    const chart = useMemo(() => {
        if (!points || points.length === 0) {
            return null;
        }

        const formatLongDate = new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeZone: 'UTC',
        });

        const formatNumber = (value: number) => formatObjectiveValue(value, locale);

        const withUnit = (value: number) =>
            objective.unit ? `${formatNumber(value)} ${objective.unit}` : formatNumber(value);

        const { series, pace } = buildSeries(objective, points);

        const dates = [...series, ...pace].map(point => point.date);
        const xMin = Math.min(...dates);
        const xMax = Math.max(...dates);

        const xDomain: [number, number] =
            xMin === xMax ? [xMin - DAY_MS, xMax + DAY_MS] : [xMin, xMax];

        const yearAxis = usesYearTicks(...xDomain);

        const formatDate = new Intl.DateTimeFormat(locale, {
            day: yearAxis ? undefined : 'numeric',
            month: yearAxis ? undefined : 'short',
            year: yearAxis || crossesYear(...xDomain) ? 'numeric' : undefined,
            timeZone: 'UTC',
        });

        const bounds = [
            objective.startValue,
            objective.targetValue,
            ...series.map(point => point.value),
        ];

        const yMin = Math.min(...bounds);
        const yMax = Math.max(...bounds);

        const definition = defineChart({
            marks: [
                areaY(series, {
                    id: 'progress-area',
                    key: 'key',
                    x: 'date',
                    y1: yMin,
                    y2: 'value',
                    fill: LINE_COLOR,
                    fillOpacity: 0.15,
                }),
                ruleY([objective.targetValue], {
                    id: 'target',
                    stroke: MUTED_COLOR,
                    strokeOpacity: 0.9,
                    strokeDasharray: '6 4',
                }),
                lineY(pace, {
                    id: 'pace',
                    x: 'date',
                    y: 'value',
                    stroke: MUTED_COLOR,
                    strokeWidth: 1.5,
                    strokeDasharray: '2 4',
                }),
                lineY(series, {
                    id: 'progress-line',
                    key: 'key',
                    x: 'date',
                    y: 'value',
                    stroke: LINE_COLOR,
                    strokeWidth: 2.5,
                    points: true,
                }),
            ],
            scales: {
                x: {
                    scale: scaleLinear().domain(xDomain),
                    axis: {
                        ticks: {
                            values: yearAxis ? yearTicks(...xDomain) : dayTicks(...xDomain),
                            format: value => formatDate.format(value),
                        },
                    },
                },
                y: {
                    scale: scaleLinear().domain([yMin, yMax]),
                    nice: true,
                    grid: true,
                    axis: { ticks: { format: formatNumber } },
                },
            },
            tooltip: {
                use: tooltip,
                content: ([point]) => {
                    const datum = point?.datum;

                    if (!datum) {
                        return { rows: [] };
                    }

                    const title = formatLongDate.format(datum.date);

                    if (datum.kind === 'pace') {
                        return {
                            title,
                            rows: [{ label: t('idealPace'), value: withUnit(datum.value) }],
                        };
                    }

                    if (datum.kind === 'start') {
                        return {
                            title,
                            color: LINE_COLOR,
                            rows: [{ label: t('startValue'), value: withUnit(datum.value) }],
                        };
                    }

                    return {
                        title,
                        color: LINE_COLOR,
                        rows: [
                            { label: t('value'), value: withUnit(datum.value) },
                            { label: t('increment'), value: `+${withUnit(datum.delta ?? 0)}` },
                            ...(datum.comment
                                ? [{ label: t('comment'), value: datum.comment }]
                                : []),
                        ],
                    };
                },
            },
        });

        return { definition, hasPace: pace.length > 0 };
    }, [points, locale, objective, t]);

    if (history.isPending) {
        return <Skeleton className="w-full" style={{ height: CHART_HEIGHT }} />;
    }

    if (history.isError) {
        return <QueryErrorFallback onRetry={() => void history.refetch()} />;
    }

    if (!chart) {
        return (
            <p className="text-muted-foreground text-sm" data-testid="progress-chart-empty">
                {t('empty')}
            </p>
        );
    }

    return (
        <div className="space-y-2" data-testid="progress-chart">
            <Chart
                definition={chart.definition}
                height={CHART_HEIGHT}
                initialWidth={640}
                ariaLabel={t('ariaLabel')}
                className="text-muted-foreground text-xs"
            />
            <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <li className="flex items-center gap-1.5">
                    <span
                        className="h-0.5 w-4 rounded-full"
                        style={{ background: LINE_COLOR }}
                        aria-hidden
                    />
                    {t('legendProgress')}
                </li>
                <li className="flex items-center gap-1.5">
                    <span className="w-4 border-t border-dashed border-current" aria-hidden />
                    {t('legendTarget')}
                </li>
                {chart.hasPace ? (
                    <li className="flex items-center gap-1.5">
                        <span className="w-4 border-t border-dotted border-current" aria-hidden />
                        {t('legendPace')}
                    </li>
                ) : null}
            </ul>
            {history.data.isTruncated ? (
                <p className="text-muted-foreground text-xs" data-testid="progress-chart-truncated">
                    {t('historyLimited')}
                </p>
            ) : null}
        </div>
    );
}
