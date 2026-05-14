'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface MonthlyProgressChartProps {
    preloadedMonthlyProgressQuery: Preloaded<typeof api.dashboard.getMonthlyProgress>;
}

export default function MonthlyProgressChart({
    preloadedMonthlyProgressQuery,
}: MonthlyProgressChartProps) {
    const t = useTranslations('DashboardHome');
    const monthlyProgress = usePreloadedQuery(preloadedMonthlyProgressQuery);

    const chartData = (monthlyProgress ?? []).map(item => ({
        month: formatMonthLabel(item.monthKey),
        count: item.count,
    }));

    return (
        <Card data-testid="monthly-progress-chart">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">
                        {t('charts.monthlyProgress')}
                    </CardTitle>
                    <CardDescription>{t('charts.monthlyProgressDescription')}</CardDescription>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {!monthlyProgress ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : chartData.length === 0 || chartData.every(d => d.count === 0) ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            {t('charts.noDataAvailable')}
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis
                                dataKey="month"
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '0.5rem',
                                    color: 'hsl(var(--popover-foreground))',
                                }}
                                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                            />
                            <Bar
                                dataKey="count"
                                name={t('charts.updates')}
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    if (!year || !month) return monthKey;
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(undefined, { month: 'short' });
}
