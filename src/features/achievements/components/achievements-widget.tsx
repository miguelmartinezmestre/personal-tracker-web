'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import type { Achievement } from '@/features/achievements/components/achievement-card';
import { achievementIcon } from '@/features/achievements/lib/achievement-icons';

const SHOWN = 3;

function AchievementRow({ achievement }: { achievement: Achievement }) {
    const t = useTranslations('Achievements');
    const Icon = achievementIcon(achievement);
    const name = t(`items.${achievement.code}.name`);

    return (
        <li className="flex items-center gap-3" data-testid="achievement-widget-row">
            <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{name}</p>
                {achievement.earnedAt === null && (
                    <Progress
                        value={achievement.progress}
                        max={achievement.threshold}
                        aria-label={t('progressLabel', { name })}
                    />
                )}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
                {achievement.earnedAt === null
                    ? t('progress', {
                          progress: achievement.progress,
                          threshold: achievement.threshold,
                      })
                    : t('points', { points: achievement.points })}
            </span>
        </li>
    );
}

// The latest achievements earned and the closest ones to earn (INH-DAS-06).
export function AchievementsWidget() {
    const t = useTranslations('Achievements.widget');
    const achievements = useQuery(convexQuery(api.achievements.getAchievements, {}));

    if (achievements.isError) {
        return <QueryErrorFallback onRetry={() => void achievements.refetch()} />;
    }

    if (!achievements.data) {
        return <Skeleton className="h-48" />;
    }

    const all = achievements.data.achievements;

    const recent = all
        .filter(achievement => achievement.earnedAt !== null)
        .sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0))
        .slice(0, SHOWN);

    const next = all
        .filter(achievement => achievement.earnedAt === null)
        .sort((a, b) => b.progress / b.threshold - a.progress / a.threshold)
        .slice(0, SHOWN);

    return (
        <Card data-testid="achievements-widget">
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {t('points', { points: achievements.data.userPoints })}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <section className="space-y-3">
                    <h3 className="text-sm font-medium">{t('recent')}</h3>
                    {recent.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('none')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {recent.map(achievement => (
                                <AchievementRow key={achievement.code} achievement={achievement} />
                            ))}
                        </ul>
                    )}
                </section>
                <section className="space-y-3">
                    <h3 className="text-sm font-medium">{t('next')}</h3>
                    <ul className="space-y-3">
                        {next.map(achievement => (
                            <AchievementRow key={achievement.code} achievement={achievement} />
                        ))}
                    </ul>
                </section>
                <Link
                    href="/dashboard/achievements"
                    className="text-primary text-sm font-medium hover:underline md:col-span-2"
                >
                    {t('viewAll')}
                </Link>
            </CardContent>
        </Card>
    );
}
