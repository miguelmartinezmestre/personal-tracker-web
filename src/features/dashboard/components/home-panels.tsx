'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';

type DashboardQueryState = {
    isError: boolean;
    error: unknown;
    onRetry: () => void;
};

type DashboardWelcomeProps = {
    isError: boolean;
    error: unknown;
    onRetry: () => void;
    name: string | undefined;
};

export function DashboardWelcome({ isError, error, onRetry, name }: DashboardWelcomeProps) {
    const t = useTranslations('DashboardHome');

    if (isError) {
        return <QueryErrorFallback error={error} onRetry={onRetry} />;
    }
    if (name === undefined) {
        return <Loader2 className="animate-spin" />;
    }
    return t('welcome', { name });
}

type UpcomingDeadlinesCardProps = {
    query: DashboardQueryState;
    items: Array<{ id: string; title: string; daysRemaining: number }>;
    isTruncated: boolean;
    isLoaded: boolean;
};

export function UpcomingDeadlinesCard({
    query,
    items,
    isTruncated,
    isLoaded,
}: UpcomingDeadlinesCardProps) {
    const t = useTranslations('DashboardHome');

    let body;
    if (query.isError) {
        body = <QueryErrorFallback error={query.error} onRetry={query.onRetry} />;
    } else if (!isLoaded) {
        body = <Loader2 className="h-5 w-5 animate-spin" />;
    } else if (items.length === 0) {
        body = <p className="text-sm text-muted-foreground">{t('noUpcomingDeadlines')}</p>;
    } else {
        body = (
            <ul className="space-y-2">
                {items.slice(0, 5).map(deadline => (
                    <li key={deadline.id} className="flex justify-between text-sm">
                        <span className="truncate mr-2">{deadline.title}</span>
                        <span className="text-muted-foreground shrink-0">
                            {t('deadlineDaysRemaining', { days: deadline.daysRemaining })}
                        </span>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <Card className="md:col-span-1" data-testid="upcoming-deadlines">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('upcomingDeadlines')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {body}
                {isTruncated ? (
                    <p className="mt-2 text-xs text-muted-foreground" role="status">
                        {t('partialData')}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

type RecentActivityCardProps = {
    query: DashboardQueryState;
    activity:
        | {
              progressUpdatesCount: number;
              objectivesCreatedCount: number;
              objectivesCompletedCount: number;
              periodDays: number;
          }
        | undefined;
};

export function RecentActivityCard({ query, activity }: RecentActivityCardProps) {
    const t = useTranslations('DashboardHome');

    let body;
    if (query.isError) {
        body = <QueryErrorFallback error={query.error} onRetry={query.onRetry} />;
    } else if (!activity) {
        body = <Loader2 className="h-5 w-5 animate-spin" />;
    } else {
        body = (
            <>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('activity.progressUpdates')}</span>
                    <span className="font-medium">{activity.progressUpdatesCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('activity.objectivesCreated')}</span>
                    <span className="font-medium">{activity.objectivesCreatedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {t('activity.objectivesCompleted')}
                    </span>
                    <span className="font-medium">{activity.objectivesCompletedCount}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t('activity.period', { days: activity.periodDays })}
                </p>
            </>
        );
    }

    return (
        <Card className="md:col-span-1" data-testid="recent-activity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('recentActivity')}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">{body}</CardContent>
        </Card>
    );
}
