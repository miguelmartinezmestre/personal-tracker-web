'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';

interface TopObjectivesChartProps {
    preloadedTopObjectivesQuery: Preloaded<typeof api.dashboard.getObjectivesWithMostProgress>;
}

export default function TopObjectivesChart({
    preloadedTopObjectivesQuery,
}: TopObjectivesChartProps) {
    const t = useTranslations('DashboardHome');
    const topObjectives = usePreloadedAuthQuery(preloadedTopObjectivesQuery);

    const chartData = (topObjectives ?? []).map(item => ({
        name: truncateText(item.objective, 20),
        progress: Math.round(item.progress),
        status: item.status,
    }));

    return (
        <Card data-testid="top-objectives-chart">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">
                        {t('charts.topObjectives')}
                    </CardTitle>
                    <CardDescription>{t('charts.topObjectivesDescription')}</CardDescription>
                </div>
                <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {!topObjectives ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            {t('charts.noDataAvailable')}
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={value => `${value}%`}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                                width={100}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '0.5rem',
                                    color: 'hsl(var(--popover-foreground))',
                                }}
                                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                formatter={(value: number | undefined) => [
                                    `${value ?? 0}%`,
                                    t('charts.progress'),
                                ]}
                            />
                            <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                                {chartData.map(entry => (
                                    <Cell
                                        key={entry.name}
                                        fill={
                                            entry.status === 'completed'
                                                ? 'hsl(var(--chart-2))'
                                                : 'hsl(var(--primary))'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '\u2026';
}
