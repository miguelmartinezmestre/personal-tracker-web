'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';

interface ProgressTimelinePoint {
    date: number;
    currentValue: number;
    objective: number;
}

interface ObjectiveProgressTimelineProps {
    data: ProgressTimelinePoint[];
    unit?: string | null;
    targetValue?: number | null;
}

export default function ObjectiveProgressTimeline({
    data,
    unit,
    targetValue,
}: ObjectiveProgressTimelineProps) {
    const t = useTranslations('UpdateProgress');
    const locale = useLocale();

    const dateFormatter = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    });

    const fullDateFormatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    if (data.length < 2) return null;

    const chartData = data.map(point => ({
        date: point.date,
        label: dateFormatter.format(new Date(point.date)),
        fullLabel: fullDateFormatter.format(new Date(point.date)),
        value: point.currentValue,
    }));

    const unitSuffix = unit ? ` ${unit}` : '';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">
                        {t('charts.progressTimeline')}
                    </CardTitle>
                    <CardDescription>{t('charts.progressTimelineDescription')}</CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                            dataKey="label"
                            className="text-xs fill-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            className="text-xs fill-muted-foreground"
                            tickLine={false}
                            axisLine={false}
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
                            labelFormatter={(_label, payload) => {
                                const item = payload[0]?.payload as
                                    | { fullLabel: string }
                                    | undefined;
                                return item?.fullLabel ?? String(_label);
                            }}
                            formatter={value => [
                                `${typeof value === 'number' ? value : 0}${unitSuffix}`,
                                t('charts.value'),
                            ]}
                        />
                        {targetValue != null && (
                            <ReferenceLine
                                y={targetValue}
                                stroke="var(--destructive)"
                                strokeDasharray="6 3"
                                label={{
                                    value: `${t('charts.target')}: ${targetValue}${unitSuffix}`,
                                    position: 'insideTopRight',
                                    className: 'text-xs fill-muted-foreground',
                                }}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--primary)"
                            fill="url(#progressGradient)"
                            strokeWidth={2}
                            dot={{ r: 3, fill: 'var(--primary)' }}
                            activeDot={{ r: 5 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
