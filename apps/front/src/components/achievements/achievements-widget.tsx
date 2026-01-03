'use client';

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { Trophy, ChevronRight, Star, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useUserAchievementStats, useRecentAchievements } from '@/hooks/api/use-achievements';
import { AchievementBadge } from './achievement-badge';
import type { AchievementTier } from '@/schemas/achievement';

interface AchievementsWidgetProps {
    limit?: number;
}

export function AchievementsWidget({ limit = 4 }: AchievementsWidgetProps) {
    const t = useTranslations('Achievements');
    const { data: stats, isLoading: statsLoading } = useUserAchievementStats();
    const { data: recentAchievements, isLoading: achievementsLoading } =
        useRecentAchievements(limit);

    const isLoading = statsLoading || achievementsLoading;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
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
        <Card data-testid="achievements-widget">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {t('widget.title')}
                </CardTitle>
                <CardAction>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/achievements">
                            {t('widget.viewAll')}
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Star className="h-8 w-8 text-yellow-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.totalPoints ?? 0}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('stats.totalPoints')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Award className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-2xl font-bold">
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
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">
                                {t('widget.recentlyEarned')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {recentAchievements.map(achievement => (
                                    <AchievementBadge
                                        key={achievement._id}
                                        icon={achievement.definition?.icon ?? 'Trophy'}
                                        tier={
                                            (achievement.definition?.tier as AchievementTier) ??
                                            'bronze'
                                        }
                                        name={t(
                                            `definitions.${achievement.definition?.code}.name`,
                                            {
                                                defaultValue:
                                                    achievement.definition?.code ?? 'Achievement',
                                            }
                                        )}
                                        earned={true}
                                        size="md"
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {t('widget.noAchievements')}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
