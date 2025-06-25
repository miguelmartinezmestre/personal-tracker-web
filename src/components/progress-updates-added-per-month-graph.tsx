"use client"
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { useTranslations } from 'next-intl';

const chartData = [
    { month: 'January', count: 186 },
    { month: 'February', count: 305 },
    { month: 'March', count: 237 },
    { month: 'April', count: 73 },
    { month: 'May', count: 209 },
    { month: 'June', count: 214 },
    { month: 'July', count: 214 },
    { month: 'August', count: 214 },
    { month: 'September', count: 214 },
    { month: 'October', count: 214 },
    { month: 'November', count: 214 },
    { month: 'December', count: 214 },
];

export function ProgressUpdatesAddedPerMonthGraph({ data }: { data: { month: string; count: number }[] }) {
    const t = useTranslations('Stats');
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('progressUpdatesAddedPerMonth')}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{} satisfies ChartConfig}>
                    <BarChart accessibilityLayer data={data}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={value => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="count" fill="var(--color-count)" radius={7} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
