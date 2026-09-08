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
import { ChartDataTable } from '@/components/chart-data-table';

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
                <MonthlyProgressChartBody
                    isError={monthlyProgressQuery.isError}
                    error={monthlyProgressQuery.error}
                    isLoading={!monthlyProgress}
                    isEmpty={
                        chartData.length === 0 ||
                        chartData.every(monthEntry => monthEntry.count === 0)
                    }
                    onRetry={() => {
                        void monthlyProgressQuery.refetch();
                    }}
                    emptyLabel={t('charts.noDataAvailable')}
                    chartData={chartData}
                    updatesLabel={t('charts.updates')}
                />
                {monthlyProgress && !monthlyProgressQuery.isError ? (
                    <ChartDataTable
                        caption={t('charts.monthlyProgress')}
                        columns={[t('charts.month'), t('charts.updates')]}
                        rows={monthlyProgress.items.map(item => ({
                            id: item.monthKey,
                            values: [formatMonthLabel(item.monthKey, locale), item.count],
                        }))}
                    />
                ) : null}
                {monthlyProgress?.isTruncated ? (
                    <p className="text-xs text-muted-foreground" role="status">
                        {t('charts.partialData')}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

function MonthlyProgressChartBody({
    isError,
    error,
    isLoading,
    isEmpty,
    onRetry,
    emptyLabel,
    chartData,
    updatesLabel,
}: {
    isError: boolean;
    error: unknown;
    isLoading: boolean;
    isEmpty: boolean;
    onRetry: () => void;
    emptyLabel: string;
    chartData: Array<{ month: string; count: number }>;
    updatesLabel: string;
}) {
    if (isError) {
        return <QueryErrorFallback error={error} onRetry={onRetry} />;
    }
    if (isLoading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
            </div>
        );
    }
    if (isEmpty) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            </div>
        );
    }
    return (
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
                    name={updatesLabel}
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

function formatMonthLabel(monthKey: string, locale: string): string {
    const [year, month] = monthKey.split('-');
    if (!year || !month) {
        return monthKey;
    }
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(Number(year), Number(month) - 1)
    );
}
