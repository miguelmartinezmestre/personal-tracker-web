'use client';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
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
    Rectangle,
    type BarShapeProps,
} from 'recharts';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { ChartDataTable } from '@/components/chart-data-table';
import { getOptionalString, isJsonObject } from '@shared/boundary-values';
function TopObjectiveBarShape(props: BarShapeProps) {
    const status = isJsonObject(props.payload)
        ? getOptionalString(props.payload.status)
        : undefined;
    const fill = status === 'completed' ? 'var(--chart-2)' : 'var(--primary)';
    return <Rectangle {...props} fill={fill} />;
}
function formatProgressTick(value: number | string): string {
    return `${typeof value === 'number' ? value : 0}%`;
}
export default function TopObjectivesChart() {
    const t = useTranslations('DashboardHome');
    const topObjectivesQuery = useQuery(
        convexQuery(api.dashboard.getObjectivesWithMostProgress, {})
    );
    const { data: topObjectives } = topObjectivesQuery;
    const chartData = (topObjectives?.items ?? []).map(item => ({
        name: truncateText(item.objective, 20),
        progress: Math.round(item.progress),
        status: item.status,
    }));
    let chartBody;
    if (topObjectivesQuery.isError) {
        chartBody = (
            <QueryErrorFallback
                error={topObjectivesQuery.error}
                onRetry={() => {
                    void topObjectivesQuery.refetch();
                }}
            />
        );
    } else if (!topObjectives) {
        chartBody = (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
            </div>
        );
    } else if (chartData.length === 0) {
        chartBody = (
            <div className="flex h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('charts.noDataAvailable')}</p>
            </div>
        );
    } else {
        chartBody = (
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
                        tickFormatter={formatProgressTick}
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
                            backgroundColor: 'var(--popover)',
                            borderColor: 'var(--border)',
                            borderRadius: '0.5rem',
                            color: 'var(--popover-foreground)',
                        }}
                        labelStyle={{ color: 'var(--popover-foreground)' }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                        formatter={value => [
                            `${typeof value === 'number' ? value : 0}%`,
                            t('charts.progress'),
                        ]}
                    />
                    <Bar dataKey="progress" radius={[0, 4, 4, 0]} shape={TopObjectiveBarShape} />
                </BarChart>
            </ResponsiveContainer>
        );
    }
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
            <CardContent className="space-y-2">
                {chartBody}
                {topObjectives && !topObjectivesQuery.isError ? (
                    <ChartDataTable
                        caption={t('charts.topObjectives')}
                        columns={[t('charts.objective'), t('charts.progress')]}
                        rows={topObjectives.items.map(item => ({
                            id: item.id,
                            values: [item.objective, `${Math.round(item.progress)}%`],
                        }))}
                    />
                ) : null}
            </CardContent>
        </Card>
    );
}
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength - 1) + '\u2026';
}
