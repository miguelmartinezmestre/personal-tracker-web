'use client';

import { useTranslations } from 'next-intl';
import { AchievementsWidget } from '@/features/achievements/components/achievements-widget';
import { api } from '@/convex/_generated/api';
import { Loader2, Target, CheckCircle, Calendar, Activity } from 'lucide-react';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function Home({
    preloadedUserQuery,
    preloadedUserAchievementStatsQuery,
    preloadedUserRecentAchievementsQuery,
    preloadedDashboardStatsQuery,
    preloadedUpcomingDeadlinesQuery,
    preloadedRecentActivityQuery,
    preloadedMonthlyProgressQuery,
    preloadedTopObjectivesQuery,
}: {
    preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;
    preloadedUserAchievementStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
    preloadedUserRecentAchievementsQuery: Preloaded<typeof api.achievements.getRecentAchievements>;
    preloadedDashboardStatsQuery: Preloaded<typeof api.dashboard.getDashboardStats>;
    preloadedUpcomingDeadlinesQuery: Preloaded<typeof api.dashboard.getUpcomingDeadlines>;
    preloadedRecentActivityQuery: Preloaded<typeof api.dashboard.getRecentActivity>;
    preloadedMonthlyProgressQuery: Preloaded<typeof api.dashboard.getMonthlyProgress>;
    preloadedTopObjectivesQuery: Preloaded<typeof api.dashboard.getObjectivesWithMostProgress>;
}) {
    const user = usePreloadedAuthQuery(preloadedUserQuery);
    const stats = usePreloadedAuthQuery(preloadedDashboardStatsQuery);
    const upcomingDeadlines = usePreloadedAuthQuery(preloadedUpcomingDeadlinesQuery);
    const recentActivity = usePreloadedAuthQuery(preloadedRecentActivityQuery);

    const t = useTranslations('DashboardHome');

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{t('dashboardTitle')}</h1>
                <p data-testid="welcome-message" className="text-muted-foreground">
                    {!user ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        t('welcome', { name: user?.name ?? '' })
                    )}
                </p>
            </div>

            {/* Objectives stats */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MonthlyProgressChart
                    preloadedMonthlyProgressQuery={preloadedMonthlyProgressQuery}
                />
                <TopObjectivesChart preloadedTopObjectivesQuery={preloadedTopObjectivesQuery} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Achievements widget */}
                <div className="md:col-span-1">
                    <AchievementsWidget
                        preloadedUserAchievementStatsQuery={preloadedUserAchievementStatsQuery}
                        preloadedUserRecentAchievementsQuery={preloadedUserRecentAchievementsQuery}
                    />
                </div>

                {/* Upcoming deadlines */}
                <Card className="md:col-span-1" data-testid="upcoming-deadlines">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('upcomingDeadlines')}
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {!upcomingDeadlines ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : upcomingDeadlines.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('noUpcomingDeadlines')}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {upcomingDeadlines.slice(0, 5).map(d => (
                                    <li key={d.id} className="flex justify-between text-sm">
                                        <span className="truncate mr-2">{d.title}</span>
                                        <span className="text-muted-foreground shrink-0">
                                            {d.daysRemaining}d
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Recent activity */}
                <Card className="md:col-span-1" data-testid="recent-activity">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('recentActivity')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!recentActivity ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.progressUpdates')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.progressUpdatesCount}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.objectivesCreated')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.objectivesCreatedCount}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('activity.objectivesCompleted')}
                                    </span>
                                    <span className="font-medium">
                                        {recentActivity.objectivesCompletedCount}
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
