'use client';

import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { AchievementsSkeleton } from './achievements-skeleton';
import { AchievementsStats } from './achievements-stats';
import { AchievementsTabs } from './achievements-tabs';

export default function AchievementsLayout() {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading) {
        return <AchievementsSkeleton />;
    }

    if (!isAuthenticated) {
        return null;
    }

    return <AchievementsContent />;
}

function AchievementsContent() {
    const t = useTranslations('Achievements');
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

    const {
        data: stats,
        isLoading: statsLoading,
        isError: statsError,
        refetch: retryStats,
    } = useQuery(convexQuery(api.achievements.getUserAchievementStats, {}));
    const {
        data: progress,
        isLoading: progressLoading,
        isError: progressError,
        refetch: retryProgress,
    } = useQuery(convexQuery(api.achievements.getUserAchievementProgress, {}));

    const seedMutation = useMutation({
        mutationFn: useConvexMutation(api.achievements.seedAchievementDefinitions),
    });

    const isLoading = statsLoading || progressLoading;

    if (statsError || progressError) {
        return (
            <QueryErrorFallback
                onRetry={() => {
                    void retryStats();
                    void retryProgress();
                }}
            />
        );
    }
    if (isLoading || !progress) {
        return <AchievementsSkeleton />;
    }

    const filteredProgress = progress.filter(progressEntry => {
        if (filter === 'earned') {
            return progressEntry.isEarned;
        }
        if (filter === 'locked') {
            return !progressEntry.isEarned;
        }
        return true;
    });

    const individualAchievements = filteredProgress.filter(
        progressEntry => progressEntry.definition.type === 'individual'
    );
    const organizationAchievements = filteredProgress.filter(
        progressEntry => progressEntry.definition.type === 'organization'
    );

    const needsSeeding = progress.length === 0;

    return (
        <div
            className="container mx-auto w-full min-w-0 p-4 space-y-6"
            data-testid="achievements-page"
        >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <h1 className="text-2xl font-bold" data-testid="achievements-title">
                        {t('title')}
                    </h1>
                </div>
                {needsSeeding ? (
                    <div className="w-full sm:w-auto">
                        <Button
                            onClick={() => {
                                seedMutation.mutate({});
                            }}
                            disabled={seedMutation.isPending}
                            data-testid="achievements-seed-button"
                        >
                            {seedMutation.isPending ? t('seed.seeding') : t('seed.initialize')}
                        </Button>
                    </div>
                ) : null}
            </div>

            <AchievementsStats
                totalPoints={stats?.totalPoints ?? 0}
                earnedCount={stats?.earnedCount ?? 0}
                totalAvailable={stats?.totalAvailable ?? 0}
            />

            <div className="flex gap-2" data-testid="achievements-filters">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    data-testid="achievements-filter-all"
                >
                    {t('filters.all')}
                </Button>
                <Button
                    variant={filter === 'earned' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('earned')}
                    data-testid="achievements-filter-earned"
                >
                    {t('filters.earned')}
                </Button>
                <Button
                    variant={filter === 'locked' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('locked')}
                    data-testid="achievements-filter-locked"
                >
                    {t('filters.locked')}
                </Button>
            </div>

            <AchievementsTabs
                filter={filter}
                individualAchievements={individualAchievements}
                organizationAchievements={organizationAchievements}
            />
        </div>
    );
}
