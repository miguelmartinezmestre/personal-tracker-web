'use client';

import { useTranslations } from 'next-intl';
import { Cell, Pie, PieChart } from 'recharts';
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

interface ObjectivesStatusChartProps {
    completed: number;
    pending: number;
}

export function ObjectivesStatusChart({ completed, pending }: ObjectivesStatusChartProps) {
    const tCharts = useTranslations('Charts');
    const tStats = useTranslations('Stats');

    const chartConfig = {
        completed: {
            label: tCharts('labels.completed'),
            color: 'oklch(0 0 0)',
        },
        pending: {
            label: tCharts('labels.pending'),
            color: 'oklch(0.8 0 0)',
        },
    } satisfies ChartConfig;

    const total = completed + pending;
    const chartData = [
        { name: 'completed', value: completed, fill: 'oklch(0 0 0)' },
        { name: 'pending', value: pending, fill: 'oklch(0.8 0 0)' },
    ];

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>{tCharts('objectivesStatus.title')}</CardTitle>
                <CardDescription>{tCharts('objectivesStatus.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[280px]"
                >
                    <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="60%"
                            strokeWidth={5}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <div className="flex flex-col items-center justify-center text-center p-4 mt-auto border-t">
                <p className="text-sm text-muted-foreground">{tStats('totalObjectives')}</p>
                <p className="text-2xl font-bold">{total}</p>
            </div>
        </Card>
    );
}
