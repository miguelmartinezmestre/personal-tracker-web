'use client';

import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis } from 'recharts';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '../components/ui/chart';
const chartData = [
    { month: 'January', currentValue: 5, objetive: 90 },
    { month: 'February', currentValue: 23, objetive: 90 },
    { month: 'March', currentValue: 32, objetive: 90 },
    { month: 'April', currentValue: 37, objetive: 90 },
    { month: 'May', currentValue: 45, objetive: 90 },
    { month: 'June', currentValue: 52, objetive: 90 },
    { month: 'July', currentValue: 63, objetive: 90 },
    { month: 'August', currentValue: 67, objetive: 90 },
    { month: 'September', currentValue: 73, objetive: 90 },
    { month: 'October', currentValue: 75, objetive: 90 },
    { month: 'November', currentValue: 87, objetive: 90 },
    { month: 'December', currentValue: 90, objetive: 90 },
];

const chartConfig = {
    currentValue: {
        label: 'Valor Actual',
        color: 'hsl(var(--chart-1))',
    },
    objetive: {
        label: 'Objetivo',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

export function Graph3() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Line Chart - Multiple</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={value => value.slice(0, 3)}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Line
                            dataKey="currentValue"
                            type="monotone"
                            stroke="var(--color-currentValue)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            dataKey="objetive"
                            type="monotone"
                            stroke="var(--color-objetive)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <ReferenceLine y={100} stroke="red" strokeDasharray="5 5" />
                    </LineChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        <div className="flex items-center gap-2 font-medium leading-none">
                            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 leading-none text-muted-foreground">
                            Showing total visitors for the last 6 months
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
