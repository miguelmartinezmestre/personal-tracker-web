'use client';

import { useTranslations } from 'next-intl';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/chart';
import type { ChartConfig } from '@repo/ui/components/chart';

interface ObjetivesMostProgressGraphProps {
    data: {
        objective: string;
        progress: number;
    }[];
}

export function ObjetivesMostProgressGraph({ data }: ObjetivesMostProgressGraphProps) {
    const tCharts = useTranslations('Charts');

    const chartConfig = {
        progress: {
            label: tCharts('labels.progress'),
            color: 'oklch(var(--chart-2))',
        },
    } satisfies ChartConfig;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{tCharts('objectivesMostProgress.title')}</CardTitle>
                <CardDescription>{tCharts('objectivesMostProgress.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart
                        accessibilityLayer
                        data={data}
                        layout="vertical"
                        margin={{ left: 10, right: 40 }}
                    >
                        <YAxis
                            dataKey="objective"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={value =>
                                value.length > 25 ? `${value.substring(0, 25)}...` : value
                            }
                            width={150}
                        />
                        <XAxis dataKey="progress" type="number" hide />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar
                            dataKey="progress"
                            layout="vertical"
                            fill="var(--color-progress)"
                            radius={4}
                        >
                            <LabelList
                                dataKey="progress"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                                formatter={(value: number) => `${value}%`}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
