'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Star, Award, Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { achievementProgressSchema, type AchievementProgress } from '@/features/achievements/achievement';
import { AchievementCard } from '@/features/achievements/achievement-card';
import type { AchievementTier } from '@/features/achievements/achievement';

export default function AchievementsPage() {
    const t = useTranslations('Achievements');
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery(convexQuery(api.achievements.getUserAchievementStats, {}));
    const { data: progress, isLoading: progressLoading } = useQuery({
        ...convexQuery(api.achievements.getUserAchievementProgress, {}),
        select: (data): AchievementProgress[] =>
            data.map(item => achievementProgressSchema.parse(item)),
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

    // Filter achievements based on selected filter
    const filteredProgress = progress?.filter(p => {
        if (filter === 'earned') return p.isEarned;
        if (filter === 'locked') return !p.isEarned;
        return true;
    });

    // Separate individual and team achievements
    const individualAchievements = filteredProgress?.filter(
        p => p.definition.type === 'individual'
    );
    const teamAchievements = filteredProgress?.filter(p => p.definition.type === 'team');

    const handleSeedAchievements = async () => {
        try {
            await seedMutation.mutateAsync({});
        } catch (error) {
            console.error('Error seeding achievements:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>
        );
    }

    // Check if we need to seed achievements
    const needsSeeding = !progress || progress.length === 0;

    return (
        <div className="container mx-auto p-4 space-y-6" data-testid="achievements-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <h1 className="text-2xl font-bold" data-testid="achievements-title">
                        {t('title')}
                    </h1>
                </div>
                {needsSeeding && (
                    <Button
                        onClick={handleSeedAchievements}
                        disabled={seedMutation.isPending}
                        data-testid="achievements-seed-button"
                    >
                        {seedMutation.isPending ? 'Seeding...' : 'Initialize Achievements'}
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="achievements-stats" data-tour="achievement-stats">
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

            {/* Filter buttons */}
            <div className="flex gap-2" data-testid="achievements-filters" data-tour="achievement-filters">
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

            {/* Achievements Tabs */}
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
                        value="team"
                        className="flex items-center gap-2"
                        data-testid="achievements-tab-team"
                    >
                        <Users className="h-4 w-4" />
                        {t('types.team')}
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
                            data-tour="achievements-grid"
                        >
                            {individualAchievements.map(achievement => (
                                <AchievementCard
                                    key={String(achievement.definition._id)}
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

                <TabsContent value="team" className="mt-6" data-testid="achievements-content-team">
                    {teamAchievements && teamAchievements.length > 0 ? (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            data-testid="achievements-grid-team"
                        >
                            {teamAchievements.map(achievement => (
                                <AchievementCard
                                    key={String(achievement.definition._id)}
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
                                    {t('empty.noTeamAchievements')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
