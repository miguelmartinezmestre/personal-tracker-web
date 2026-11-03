'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { barX, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { formatProgressPercent } from '@/features/objectives/lib/format';

const BAR_HEIGHT = 36;

type RankedObjective = { id: string; title: string; progressPercent: number };

export default function TopObjectivesChart({ objectives }: { objectives: RankedObjective[] }) {
    const t = useTranslations('DashboardHome.charts');
    const locale = useLocale();

    const definition = useMemo(
        () =>
            defineChart({
                marks: [
                    barX(objectives, {
                        x: 'progressPercent',
                        y: 'title',
                        key: 'id',
                        fill: 'var(--chart-2)',
                        radius: 4,
                        maxThickness: 24,
                    }),
                ],
                scales: {
                    x: {
                        scale: scaleLinear().domain([0, 100]),
                        grid: true,
                        axis: { ticks: { format: value => formatProgressPercent(value, locale) } },
                    },
                    y: { scale: () => scaleBand().padding(0.25) },
                },
                tooltip: {
                    use: tooltip,
                    content: ([point]) => ({
                        title: point?.datum.title,
                        rows: point
                            ? [
                                  {
                                      label: t('progress'),
                                      value: formatProgressPercent(
                                          point.datum.progressPercent,
                                          locale
                                      ),
                                  },
                              ]
                            : [],
                    }),
                },
            }),
        [objectives, locale, t]
    );

    return (
        <>
            <Chart
                definition={definition}
                height={Math.max(objectives.length * BAR_HEIGHT + 48, 140)}
                initialWidth={480}
                ariaLabel={t('topObjectivesAria')}
                className="text-muted-foreground text-xs"
            />
            <table className="sr-only">
                <caption>{t('topObjectives')}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t('objective')}</th>
                        <th scope="col">{t('progress')}</th>
                    </tr>
                </thead>
                <tbody>
                    {objectives.map(objective => (
                        <tr key={objective.id}>
                            <td>{objective.title}</td>
                            <td>{formatProgressPercent(objective.progressPercent, locale)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
