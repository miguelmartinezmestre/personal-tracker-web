'use client';

import { useTranslations } from 'next-intl';
import { AchievementsWidget } from '@/features/achievements/components/achievements-widget';
import { api } from '@/convex/_generated/api';
import { Target, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import StatCard from '@/features/dashboard/components/stat-card';
import dynamic from 'next/dynamic';
import { useReferenceNow } from '@/lib/reference-now';
import { DashboardWelcome, RecentActivityCard, UpcomingDeadlinesCard } from './home-panels';

const MonthlyProgressChart = dynamic(
    () => import('@/features/dashboard/components/monthly-progress-chart'),
    { ssr: false }
);
const TopObjectivesChart = dynamic(
    () => import('@/features/dashboard/components/top-objectives-chart'),
    { ssr: false }
);

export default function Home() {
    const referenceNow = useReferenceNow();
    const userQuery = useQuery(convexQuery(api.auth.getCurrentUser, {}));
    const { data: user } = userQuery;
    const statsQuery = useQuery(convexQuery(api.dashboard.getDashboardStats, {}));
    const deadlinesQuery = useQuery(
        convexQuery(api.dashboard.getUpcomingDeadlines, { now: referenceNow })
    );
    const activityQuery = useQuery(
        convexQuery(api.dashboard.getRecentActivity, { now: referenceNow })
    );
    const { data: stats } = statsQuery;
    const { data: upcomingDeadlines } = deadlinesQuery;
    const { data: recentActivity } = activityQuery;
    const upcomingDeadlineItems = upcomingDeadlines?.items ?? [];
    const t = useTranslations('DashboardHome');

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{t('dashboardTitle')}</h1>
                <div data-testid="welcome-message" className="text-muted-foreground">
                    <DashboardWelcome
                        isError={userQuery.isError}
                        error={userQuery.error}
                        onRetry={() => {
                            void userQuery.refetch();
                        }}
                        name={user?.name}
                    />
                </div>
            </div>

            {statsQuery.isError ? (
                <QueryErrorFallback
                    error={statsQuery.error}
                    onRetry={() => {
                        void statsQuery.refetch();
                    }}
                />
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
                <UpcomingDeadlinesCard
                    query={{
                        isError: deadlinesQuery.isError,
                        error: deadlinesQuery.error,
                        onRetry: () => {
                            void deadlinesQuery.refetch();
                        },
                    }}
                    items={upcomingDeadlineItems}
                    isTruncated={upcomingDeadlines?.isTruncated ?? false}
                    isLoaded={Boolean(upcomingDeadlines)}
                />
                <RecentActivityCard
                    query={{
                        isError: activityQuery.isError,
                        error: activityQuery.error,
                        onRetry: () => {
                            void activityQuery.refetch();
                        },
                    }}
                    activity={recentActivity}
                />
            </div>
        </div>
    );
}
