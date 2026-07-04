'use client';

import { useTranslations } from 'next-intl';
import { AchievementsWidget } from '@/features/achievements/components/achievements-widget';
import { api } from '@/convex/_generated/api';
import { Loader2, Target, CheckCircle, Calendar, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import StatCard from '@/features/dashboard/components/stat-card';
import dynamic from 'next/dynamic';

const MonthlyProgressChart = dynamic(
    () => import('@/features/dashboard/components/monthly-progress-chart'),
    { ssr: false }
);
const TopObjectivesChart = dynamic(
    () => import('@/features/dashboard/components/top-objectives-chart'),
    { ssr: false }
);

export default function Home() {
    const userQuery = useQuery(convexQuery(api.auth.getCurrentUser, {}));
    const { data: user } = userQuery;
    const statsQuery = useQuery(convexQuery(api.dashboard.getDashboardStats, {}));
    const deadlinesQuery = useQuery(convexQuery(api.dashboard.getUpcomingDeadlines, {}));
    const activityQuery = useQuery(convexQuery(api.dashboard.getRecentActivity, {}));
    const { data: stats } = statsQuery;
    const { data: upcomingDeadlines } = deadlinesQuery;
    const { data: recentActivity } = activityQuery;
    const upcomingDeadlineItems = upcomingDeadlines?.items ?? [];

    const t = useTranslations('DashboardHome');

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{t('dashboardTitle')}</h1>
                <p data-testid="welcome-message" className="text-muted-foreground">
                    {userQuery.isError ? (
                        t('welcome', { name: '' })
                    ) : !user ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        t('welcome', { name: user?.name ?? '' })
                    )}
                </p>
            </div>

            {statsQuery.isError ? (
                <QueryErrorFallback onRetry={() => statsQuery.refetch()} />
            ) : (
                <div className="grid grid-cols-2 gap-4" data-testid="dashboard-stats">
                    <StatCard
                        label={t('stats.active')}
                        value={stats?.pendingObjectives}
                        icon={Target}
                    />
                    <StatCard
                        label={t('stats.completed')}
                        value={stats?.completedObjectives}
                        icon={CheckCircle}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MonthlyProgressChart />
                <TopObjectivesChart />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <AchievementsWidget />
                </div>

                <Card className="md:col-span-1" data-testid="upcoming-deadlines">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('upcomingDeadlines')}
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {deadlinesQuery.isError ? (
                            <QueryErrorFallback onRetry={() => deadlinesQuery.refetch()} />
                        ) : !upcomingDeadlines ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : upcomingDeadlineItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('noUpcomingDeadlines')}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {upcomingDeadlineItems.slice(0, 5).map(deadline => (
                                    <li key={deadline.id} className="flex justify-between text-sm">
                                        <span className="truncate mr-2">{deadline.title}</span>
                                        <span className="text-muted-foreground shrink-0">
                                            {deadline.daysRemaining}d
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-1" data-testid="recent-activity">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('recentActivity')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {activityQuery.isError ? (
                            <QueryErrorFallback onRetry={() => activityQuery.refetch()} />
                        ) : !recentActivity ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.progressUpdates')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.progressUpdatesCount}
                                        {recentActivity.isTruncated ? '+' : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.objectivesCreated')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.objectivesCreatedCount}
                                        {recentActivity.isTruncated ? '+' : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.objectivesCompleted')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.objectivesCompletedCount}
                                        {recentActivity.isTruncated ? '+' : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t('activity.period', { days: recentActivity.periodDays })}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
