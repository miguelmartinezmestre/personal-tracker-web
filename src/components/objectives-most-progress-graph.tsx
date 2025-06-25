"use client"
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
const chartData = [
    { objective: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
    { objective: 'safari', visitors: 200, fill: 'var(--color-safari)' },
    { objective: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
    { objective: 'edge', visitors: 173, fill: 'var(--color-edge)' },
    { objective: 'other', visitors: 90, fill: 'var(--color-other)' },
];

export function ObjetivesMostProgressGraph({ data }: { data: { objective: string; progress: number }[] }) {

    const t = useTranslations('Stats');

    return (
        <Card className='h-full'>
            <CardHeader>
                <CardTitle>{t('objectivesWithMostProgress')}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{} satisfies ChartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={data}
                        layout="vertical"
                        margin={{
                            left: 0,
                        }}
                    >
                        <YAxis
                            dataKey="objective"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <XAxis dataKey="progress" type="number"  />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="progress" layout="vertical" radius={5} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
