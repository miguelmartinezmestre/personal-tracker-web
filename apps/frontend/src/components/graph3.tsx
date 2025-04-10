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
// const chartData = [
//     { date: new Date('2024-01-01'), currentValue: 5, objetive: 90 },
//     { date: new Date('2024-02-01'), currentValue: 23, objetive: 90 },
//     { date: new Date('2024-03-01'), currentValue: 32, objetive: 90 },
//     { date: new Date('2024-04-01'), currentValue: 37, objetive: 90 },
//     { date: new Date('2024-05-01'), currentValue: 45, objetive: 90 },
//     { date: new Date('2024-06-01'), currentValue: 52, objetive: 90 },
//     { date: new Date('2024-07-01'), currentValue: 63, objetive: 90 },
//     { date: new Date('2024-08-01'), currentValue: 67, objetive: 90 },
//     { date: new Date('2024-09-01'), currentValue: 73, objetive: 90 },
//     { date: new Date('2024-10-01'), currentValue: 75, objetive: 90 },
//     { date: new Date('2024-11-01'), currentValue: 87, objetive: 90 },
//     { date: new Date('2024-12-01'), currentValue: 90, objetive: 90 },
// ];

export interface Progress {
    date: Date;
    currentValue: number;
    objetive: number;
}

interface ProgressProps {
    data: Progress[];
}

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

export function Graph3({ data }: ProgressProps) {
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
                        data={data}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={value =>
                                value.toLocaleDateString('es-ES', {
                                    month: 'short',
                                    day: 'numeric',
                                })
                            }
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
                        {/* <ReferenceLine y={100} stroke="red" strokeDasharray="5 5" /> */}
                    </LineChart>
                </ChartContainer>
            </CardContent>
            {/* <CardFooter>
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
            </CardFooter> */}
        </Card>
    );
}
