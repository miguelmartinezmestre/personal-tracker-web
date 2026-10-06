'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { defineChart } from '@tanstack/charts';
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';

const GAUGE_START = -Math.PI * 0.75;
const GAUGE_END = Math.PI * 0.75;

export default function AverageProgressChart({
    averageProgress,
    ariaLabel,
}: {
    averageProgress: number;
    ariaLabel: string;
}) {
    const locale = useLocale();
    const definition = useMemo(() => {
        const value = Math.min(Math.max(averageProgress, 0), 100);
        const reading = { id: 'complete', value } as const;
        const slices = pie([reading, { id: 'remaining', value: 100 - value }] as const, {
            value: 'value',
            startAngle: GAUGE_START,
            endAngle: GAUGE_END,
        });
        const percent = new Intl.NumberFormat(locale, { style: 'percent' });

        return defineChart({
            marks: [
                polar({
                    radiusRatio: 0.9,
                    scales: {
                        angle: { scale: scaleLinear().domain([0, 1]) },
                        radius: { scale: scaleLinear().domain([0, 1]) },
                    },
                    marks: [
                        radialArc(slices, {
                            innerRadius: ({ radius }) => radius * 0.74,
                            cornerRadius: 999,
                            color: 'id',
                            key: 'id',
                        }),
                        radialText([reading], {
                            angle: 0,
                            radius: 0,
                            text: row => percent.format(row.value / 100),
                            key: 'id',
                            fill: 'var(--foreground)',
                            fontSize: 28,
                            fontWeight: 700,
                        }),
                    ],
                }),
            ],
            scales: { x: null, y: null },
            color: {
                domain: ['complete', 'remaining'],
                range: ['var(--chart-2)', 'var(--muted)'],
            },
            keyboard: false,
        });
    }, [averageProgress, locale]);

    return <Chart definition={definition} height={200} initialWidth={320} ariaLabel={ariaLabel} />;
}
