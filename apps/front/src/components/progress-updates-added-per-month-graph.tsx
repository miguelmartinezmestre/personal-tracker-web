"use client"
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@repo/ui/components/chart';
import { useTranslations } from 'next-intl';

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
