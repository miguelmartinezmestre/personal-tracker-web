'use client';

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { Trophy, ChevronRight, Star, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { AchievementBadge } from './achievement-badge';
import type { AchievementTier } from '@/features/achievements/achievement';
import { cn } from '@repo/ui/lib/utils';

interface AchievementsWidgetProps {
    limit?: number;
}

export function AchievementsWidget({ limit = 4 }: AchievementsWidgetProps) {
    const t = useTranslations('Achievements');
    const { data: stats, isLoading: statsLoading } = useQuery(convexQuery(api.achievements.getUserAchievementStats, {}));
    const { data: recentAchievements, isLoading: achievementsLoading } = useQuery(convexQuery(api.achievements.getRecentAchievements, { limit }));

    const isLoading = statsLoading || achievementsLoading;

    if (isLoading) {
        return (
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 animate-pulse" />
                        <Skeleton className="h-5 w-32" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} className="w-12 h-12 rounded-full" />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            data-testid="achievements-widget"
            data-tour="achievements-widget"
            className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <div className="relative">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <div className="absolute inset-0 blur-xl bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-all" />
                    </div>
                    {t('widget.title')}
                </CardTitle>
                <CardAction>
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        <Link href="/dashboard/achievements">
                            {t('widget.viewAll')}
                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group/stat flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 hover:from-yellow-500/20 hover:to-yellow-500/10 transition-all duration-300">
                            <div className="relative">
                                <Star className="h-8 w-8 text-yellow-500 group-hover/stat:scale-110 transition-transform" />
                                <div className="absolute inset-0 blur-lg bg-yellow-500/20" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold group-hover/stat:scale-105 transition-transform origin-left">
                                    {stats?.totalPoints ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('stats.totalPoints')}
                                </p>
                            </div>
                        </div>
                        <div className="group/stat flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-300">
                            <div className="relative">
                                <Award className="h-8 w-8 text-primary group-hover/stat:scale-110 transition-transform" />
                                <div className="absolute inset-0 blur-lg bg-primary/20" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold group-hover/stat:scale-105 transition-transform origin-left">
                                    {stats?.earnedCount ?? 0}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        /{stats?.totalAvailable ?? 0}
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground">{t('stats.earned')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Achievements */}
                    {recentAchievements && recentAchievements.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                {t('widget.recentlyEarned')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {recentAchievements.map((achievement, index) => (
                                    <div
                                        key={achievement._id}
                                        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <AchievementBadge
                                            icon={achievement.definition?.icon ?? 'Trophy'}
                                            tier={
                                                (achievement.definition?.tier as AchievementTier) ??
                                                'bronze'
                                            }
                                            name={t(
                                                `definitions.${achievement.definition?.code}.name`,
                                                {
                                                    defaultValue:
                                                        achievement.definition?.code ??
                                                        'Achievement',
                                                }
                                            )}
                                            earned={true}
                                            size="md"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                                <Trophy className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('widget.noAchievements')}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
