'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { barX, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useCategoryLabel } from '@/features/categories/hooks/use-category-label';

const BAR_HEIGHT = 36;
const FALLBACK_COLOR = 'var(--muted-foreground)';
const MAX_TICKS = 5;

export type CategoryStats = {
    name: string | null;
    color: string | null;
    total: number;
    completed: number;
    averageProgress: number;
};

export default function CategoryChart({ categories }: { categories: readonly CategoryStats[] }) {
    const t = useTranslations('DashboardHome.charts');
    const locale = useLocale();
    const categoryLabel = useCategoryLabel();
    const definition = useMemo(() => {
        const formatNumber = new Intl.NumberFormat(locale);
        const rows = categories.map(category => ({
            ...category,
            label: category.name === null ? t('uncategorized') : categoryLabel(category.name),
        }));
        // Counts are whole numbers, so the axis only offers integer ticks.
        const maxTotal = Math.max(1, ...rows.map(row => row.total));
        const step = Math.ceil(maxTotal / MAX_TICKS);
        const tickValues = Array.from(
            { length: Math.ceil(maxTotal / step) + 1 },
            (_, index) => index * step
        );

        return defineChart({
            marks: [
                barX(rows, {
                    x: 'total',
                    y: 'label',
                    key: 'label',
                    fill: row => row.color ?? FALLBACK_COLOR,
                    radius: 4,
                    maxThickness: 24,
                }),
            ],
            scales: {
                x: {
                    scale: scaleLinear().domain([0, tickValues.at(-1) ?? maxTotal]),
                    grid: true,
                    axis: {
                        ticks: {
                            values: tickValues,
                            format: value => formatNumber.format(value),
                        },
                    },
                },
                y: { scale: () => scaleBand().padding(0.25) },
            },
            tooltip: {
                use: tooltip,
                content: ([point]) => {
                    const row = point?.datum;
                    if (!row) {
                        return { rows: [] };
                    }
                    return {
                        title: row.label,
                        color: row.color ?? FALLBACK_COLOR,
                        rows: [
                            { label: t('objectives'), value: formatNumber.format(row.total) },
                            {
                                label: t('completed'),
                                value: formatNumber.format(row.completed),
                            },
                            { label: t('averageProgress'), value: `${row.averageProgress}%` },
                        ],
                    };
                },
            },
        });
    }, [categories, categoryLabel, locale, t]);

    return (
        <Chart
            definition={definition}
            height={Math.max(categories.length * BAR_HEIGHT + 48, 140)}
            initialWidth={480}
            ariaLabel={t('byCategoryAria')}
            className="text-muted-foreground text-xs"
        />
    );
}
