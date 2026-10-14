'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import AverageProgressChart from '@/features/dashboard/components/average-progress-chart';
import CategoryChart from '@/features/dashboard/components/category-chart';

function DashboardStats() {
    const t = useTranslations('DashboardHome');
    const stats = useQuery(convexQuery(api.dashboard.getDashboardStats, {}));

    if (stats.isPending) {
        return (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        );
    }
    if (stats.isError) {
        return <QueryErrorFallback onRetry={() => void stats.refetch()} />;
    }
    if (stats.data.total === 0) {
        return (
            <p
                className="text-muted-foreground max-w-prose text-sm"
                data-testid="dashboard-home-empty"
            >
                {t('emptyState')}
            </p>
        );
    }

    const { total, active, completed, averageProgress, categories } = stats.data;
    return (
        <div className="space-y-2" data-testid="dashboard-stats">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('charts.averageProgress')}</CardTitle>
                        <CardDescription>
                            {t('charts.averageProgressDescription', { count: total })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <AverageProgressChart
                            averageProgress={averageProgress}
                            ariaLabel={t('charts.averageProgressAria', {
                                percent: averageProgress,
                            })}
                        />
                        <dl className="grid grid-cols-2 gap-2 text-center text-sm">
                            <div>
                                <dt className="text-muted-foreground">{t('stats.active')}</dt>
                                <dd className="text-lg font-semibold">{active}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t('stats.completed')}</dt>
                                <dd className="text-lg font-semibold">{completed}</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('charts.byCategory')}</CardTitle>
                        <CardDescription>{t('charts.byCategoryDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CategoryChart categories={categories} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function Home() {
    const t = useTranslations('DashboardHome');
    const userQuery = useQuery(convexQuery(api.auth.getCurrentUser, {}));
    const { data: user, isError, refetch } = userQuery;

    if (isError) {
        return <QueryErrorFallback onRetry={() => void refetch()} />;
    }

    return (
        <div className="flex flex-col gap-4" data-testid="dashboard-home-stub">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="welcome-message">
                {user?.name ? t('welcome', { name: user.name }) : t('welcomeAnonymous')}
            </h1>
            <DashboardStats />
        </div>
    );
}
