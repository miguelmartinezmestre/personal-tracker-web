'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useReferenceNow } from '@/lib/reference-now';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';

export default function MonthlyProgressChart() {
    const t = useTranslations('DashboardHome');
    const locale = useLocale();
    const referenceNow = useReferenceNow();
    const monthlyProgressQuery = useQuery(
        convexQuery(api.dashboard.getMonthlyProgress, { now: referenceNow })
    );
    const { data: monthlyProgress } = monthlyProgressQuery;

    const chartData = (monthlyProgress?.items ?? []).map(item => ({
        month: formatMonthLabel(item.monthKey, locale),
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
            <CardContent className="space-y-2">
                {monthlyProgressQuery.isError ? (
                    <QueryErrorFallback onRetry={() => monthlyProgressQuery.refetch()} />
                ) : !monthlyProgress ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : chartData.length === 0 ||
                  chartData.every(monthEntry => monthEntry.count === 0) ? (
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
                                    backgroundColor: 'var(--popover)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--popover-foreground)',
                                }}
                                labelStyle={{ color: 'var(--popover-foreground)' }}
                                itemStyle={{ color: 'var(--popover-foreground)' }}
                            />
                            <Bar
                                dataKey="count"
                                name={t('charts.updates')}
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
                {monthlyProgress?.isTruncated ? (
                    <p className="text-xs text-muted-foreground" role="status">
                        {t('charts.partialData')}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

function formatMonthLabel(monthKey: string, locale: string): string {
    const [year, month] = monthKey.split('-');
    if (!year || !month) return monthKey;
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(Number(year), Number(month) - 1)
    );
}
