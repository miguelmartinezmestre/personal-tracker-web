'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';

const MAX_TICKS = 5;

export default function MonthlyUpdatesChart({
    months,
}: {
    months: { month: string; count: number }[];
}) {
    const t = useTranslations('DashboardHome.charts');
    const locale = useLocale();

    const rows = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, {
            month: 'short',
            year: '2-digit',
            timeZone: 'UTC',
        });

        return months.map(entry => ({
            ...entry,
            label: format.format(Date.parse(`${entry.month}-01T00:00:00Z`)),
        }));
    }, [months, locale]);

    const definition = useMemo(() => {
        const formatNumber = new Intl.NumberFormat(locale);
        const maxCount = Math.max(1, ...rows.map(row => row.count));
        const step = Math.ceil(maxCount / MAX_TICKS);

        const tickValues = Array.from(
            { length: Math.ceil(maxCount / step) + 1 },
            (_, index) => index * step
        );

        return defineChart({
            marks: [
                barY(rows, {
                    x: 'label',
                    y: 'count',
                    key: 'month',
                    fill: 'var(--chart-1)',
                    radius: 4,
                    maxThickness: 32,
                }),
            ],
            scales: {
                x: { scale: () => scaleBand().padding(0.25) },
                y: {
                    scale: scaleLinear().domain([0, tickValues.at(-1) ?? maxCount]),
                    grid: true,
                    axis: {
                        ticks: { values: tickValues, format: value => formatNumber.format(value) },
                    },
                },
            },
            tooltip: {
                use: tooltip,
                content: ([point]) => ({
                    title: point?.datum.label,
                    rows: point
                        ? [{ label: t('updates'), value: formatNumber.format(point.datum.count) }]
                        : [],
                }),
            },
        });
    }, [rows, locale, t]);

    return (
        <>
            <Chart
                definition={definition}
                height={220}
                initialWidth={480}
                ariaLabel={t('monthlyProgressAria')}
                className="text-muted-foreground text-xs"
            />
            <table className="sr-only">
                <caption>{t('monthlyProgress')}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t('month')}</th>
                        <th scope="col">{t('updates')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.month}>
                            <td>{row.label}</td>
                            <td>{row.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
