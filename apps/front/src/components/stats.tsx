'use client';

import { useTranslations } from 'next-intl';
import { ObjectivesStatusChart } from '@/components/objectives-status-chart';
import { MonthlyProgressChart } from '@/components/monthly-progress-chart';
import { ObjetivesMostProgressGraph } from '@/components/objectives-most-progress-graph';
import {
    useDashboardStats,
    useMonthlyProgress,
    useObjectivesWithMostProgress,
} from '@/hooks/api/use-dashboard';
import { Skeleton } from '@repo/ui/components/skeleton';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';

function ChartSkeleton() {
    return (
        <Card className="h-full">
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[280px] w-full" />
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            {message}
        </div>
    );
}

export default function Stats() {
    const t = useTranslations('Stats');

    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: monthlyProgress, isLoading: monthlyLoading } = useMonthlyProgress();
    const { data: topObjectives, isLoading: topLoading } = useObjectivesWithMostProgress();

    const isLoading = statsLoading || monthlyLoading || topLoading;

    if (isLoading) {
        return (
            <div className="bg-muted/40 min-h-screen w-full p-4 sm:p-8">
                <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <ChartSkeleton />
                    </div>
                    <div className="lg:col-span-2">
                        <ChartSkeleton />
                    </div>
                    <div className="lg:col-span-3">
                        <ChartSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    const completedObjectives = stats?.completedObjectives ?? 0;
    const pendingObjectives = stats?.pendingObjectives ?? 0;

    const monthlyData = monthlyProgress ?? [];

    const objectivesWithMostProgress = topObjectives ?? [];

    return (
        <div className="bg-muted/40 min-h-screen w-full p-4 sm:p-8">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    {completedObjectives === 0 && pendingObjectives === 0 ? (
                        <Card className="h-full flex items-center justify-center">
                            <EmptyState message={t('noObjectives')} />
                        </Card>
                    ) : (
                        <ObjectivesStatusChart
                            completed={completedObjectives}
                            pending={pendingObjectives}
                        />
                    )}
                </div>
                <div className="lg:col-span-2">
                    {monthlyData.length === 0 || monthlyData.every(m => m.count === 0) ? (
                        <Card className="h-full flex items-center justify-center">
                            <EmptyState message={t('noProgressUpdates')} />
                        </Card>
                    ) : (
                        <MonthlyProgressChart data={monthlyData} />
                    )}
                </div>
                <div className="lg:col-span-3">
                    {objectivesWithMostProgress.length === 0 ? (
                        <Card className="h-full flex items-center justify-center min-h-[200px]">
                            <EmptyState message={t('noObjectivesWithProgress')} />
                        </Card>
                    ) : (
                        <ObjetivesMostProgressGraph data={objectivesWithMostProgress} />
                    )}
                </div>
            </div>
        </div>
    );
}
