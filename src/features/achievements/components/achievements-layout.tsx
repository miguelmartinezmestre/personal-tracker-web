'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Star, Award, Users, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Preloaded } from 'convex/react';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import {
    achievementProgressSchema,
    type AchievementProgress,
} from '@/features/achievements/schemas/achievement';
import { AchievementCard } from './achievement-card';

const SKELETON_STATS = [1, 2, 3];
const SKELETON_CARDS = [1, 2, 3, 4, 5, 6];
const INITIAL_ACHIEVEMENTS_STALE_TIME_MS = 30_000;

function parseAchievementProgress(data: unknown): AchievementProgress[] {
    if (!Array.isArray(data)) {
        return [];
    }

    return data.flatMap(item => {
        const result = achievementProgressSchema.safeParse(item);
        return result.success ? [result.data] : [];
    });
}

interface AchievementsLayoutProps {
    preloadedStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
    preloadedProgressQuery: Preloaded<typeof api.achievements.getUserAchievementProgress>;
}

export default function AchievementsLayout({
    preloadedStatsQuery,
    preloadedProgressQuery,
}: AchievementsLayoutProps) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading) {
        return <AchievementsSkeleton />;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <AchievementsContent
            preloadedStatsQuery={preloadedStatsQuery}
            preloadedProgressQuery={preloadedProgressQuery}
        />
    );
}

function AchievementsContent({
    preloadedStatsQuery,
    preloadedProgressQuery,
}: AchievementsLayoutProps) {
    const t = useTranslations('Achievements');
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
    const queryClient = useQueryClient();

    const initialStats = usePreloadedQuery(preloadedStatsQuery);
    const initialProgress = usePreloadedQuery(preloadedProgressQuery);

    const { data: stats, isLoading: statsLoading } = useQuery({
        ...convexQuery(api.achievements.getUserAchievementStats, {}),
        initialData: initialStats ?? undefined,
        enabled: !initialStats,
        staleTime: initialStats ? INITIAL_ACHIEVEMENTS_STALE_TIME_MS : 0,
    });
    const { data: progress, isLoading: progressLoading } = useQuery({
        ...convexQuery(api.achievements.getUserAchievementProgress, {}),
        initialData: initialProgress ?? undefined,
        enabled: !initialProgress,
        staleTime: initialProgress ? INITIAL_ACHIEVEMENTS_STALE_TIME_MS : 0,
        select: parseAchievementProgress,
    });

    const seedMutation = useMutation({
        mutationFn: useConvexMutation(api.achievements.seedAchievementDefinitions),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.achievements.getAchievementDefinitions, {}).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.achievements.getUserAchievementProgress, {}).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.achievements.getUserAchievementStats, {}).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.achievements.getUserAchievements, {}).queryKey,
            });
        },
    });

    const isLoading = statsLoading || progressLoading;

    const filteredProgress = progress?.filter(progressEntry => {
        if (filter === 'earned') return progressEntry.isEarned;
        if (filter === 'locked') return !progressEntry.isEarned;
        return true;
    });

    const individualAchievements = filteredProgress?.filter(
        progressEntry => progressEntry.definition.type === 'individual'
    );
    const organizationAchievements = filteredProgress?.filter(
        progressEntry => progressEntry.definition.type === 'organization'
    );

    const handleSeedAchievements = async () => {
        await seedMutation.mutateAsync({});
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {SKELETON_STATS.map(i => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SKELETON_CARDS.map(i => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>
        );
    }

    const needsSeeding = !progress || progress.length === 0;

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
                {needsSeeding && (
                    <div className="w-full sm:w-auto">
                        <Button
                            onClick={handleSeedAchievements}
                            disabled={seedMutation.isPending}
                            data-testid="achievements-seed-button"
                        >
                            {seedMutation.isPending ? t('seed.seeding') : t('seed.initialize')}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="achievements-stats">
                <Card data-testid="achievements-points-card">
                    <CardContent className="flex items-center gap-4 p-6">
                        <Star className="h-10 w-10 text-yellow-500" />
                        <div>
                            <p
                                className="text-3xl font-bold"
                                data-testid="achievements-total-points"
                            >
                                {stats?.totalPoints ?? 0}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('stats.totalPoints')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card data-testid="achievements-earned-card">
                    <CardContent className="flex items-center gap-4 p-6">
                        <Award className="h-10 w-10 text-primary" />
                        <div>
                            <p
                                className="text-3xl font-bold"
                                data-testid="achievements-earned-count"
                            >
                                {stats?.earnedCount ?? 0}
                                <span className="text-lg font-normal text-muted-foreground">
                                    /{stats?.totalAvailable ?? 0}
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground">{t('stats.earned')}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                                {stats?.totalAvailable
                                    ? Math.round(
                                          ((stats?.earnedCount ?? 0) / stats.totalAvailable) * 100
                                      )
                                    : 0}
                                %
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium">{t('stats.completion')}</p>
                            <p className="text-xs text-muted-foreground">
                                {t('stats.completionDescription')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

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

            <Tabs defaultValue="individual" className="w-full" data-testid="achievements-tabs">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger
                        value="individual"
                        className="flex items-center gap-2"
                        data-testid="achievements-tab-individual"
                    >
                        <User className="h-4 w-4" />
                        {t('types.individual')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="organization"
                        className="flex items-center gap-2"
                        data-testid="achievements-tab-organization"
                    >
                        <Users className="h-4 w-4" />
                        {t('types.organization')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value="individual"
                    className="mt-6"
                    data-testid="achievements-content-individual"
                >
                    {individualAchievements && individualAchievements.length > 0 ? (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            data-testid="achievements-grid-individual"
                        >
                            {individualAchievements.map(achievement => (
                                <AchievementCard
                                    key={achievement.definition._id}
                                    definition={achievement.definition}
                                    currentProgress={achievement.currentProgress}
                                    isEarned={achievement.isEarned}
                                    earnedAt={achievement.earnedAt}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    {filter === 'earned'
                                        ? t('empty.noEarned')
                                        : filter === 'locked'
                                          ? t('empty.noLocked')
                                          : t('empty.noAchievements')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent
                    value="organization"
                    className="mt-6"
                    data-testid="achievements-content-organization"
                >
                    {organizationAchievements && organizationAchievements.length > 0 ? (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            data-testid="achievements-grid-organization"
                        >
                            {organizationAchievements.map(achievement => (
                                <AchievementCard
                                    key={achievement.definition._id}
                                    definition={achievement.definition}
                                    currentProgress={achievement.currentProgress}
                                    isEarned={achievement.isEarned}
                                    earnedAt={achievement.earnedAt}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    {t('empty.noOrganizationAchievements')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AchievementsSkeleton() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {SKELETON_STATS.map(i => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SKELETON_CARDS.map(i => (
                    <Skeleton key={i} className="h-40" />
                ))}
            </div>
        </div>
    );
}
