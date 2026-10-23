'use client';

import type { FunctionReturnType } from 'convex/server';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { api } from '@/convex/_generated/api';
import { achievementIcon } from '@/features/achievements/lib/achievement-icons';
import { cn } from '@/lib/utils';

export type Achievement = FunctionReturnType<
    typeof api.achievements.getAchievements
>['achievements'][number];

const TIER_STYLES = {
    bronze: 'text-amber-700 dark:text-amber-500',
    silver: 'text-slate-500 dark:text-slate-300',
    gold: 'text-yellow-600 dark:text-yellow-400',
} as const;

export function AchievementCard({ achievement }: { achievement: Achievement }) {
    const t = useTranslations('Achievements');
    const locale = useLocale();
    const Icon = achievementIcon(achievement);
    const name = t(`items.${achievement.code}.name`);
    const isEarned = achievement.earnedAt !== null;

    return (
        <li
            className={cn('space-y-3 rounded-lg border p-4', !isEarned && 'opacity-80')}
            data-testid="achievement-card"
            data-earned={isEarned}
        >
            <div className="flex items-start gap-3">
                <Icon
                    className={cn('size-8 shrink-0', TIER_STYLES[achievement.tier])}
                    aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{name}</p>
                    <p className="text-muted-foreground text-sm">
                        {t(`items.${achievement.code}.description`)}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{t(`tiers.${achievement.tier}`)}</Badge>
                <Badge variant="secondary">{t('points', { points: achievement.points })}</Badge>
                {achievement.earnedAt !== null && (
                    <span className="text-muted-foreground">
                        {t('earnedOn', {
                            date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                                achievement.earnedAt
                            ),
                        })}
                    </span>
                )}
            </div>
            <div className="space-y-1">
                <Progress
                    value={achievement.progress}
                    max={achievement.threshold}
                    aria-label={t('progressLabel', { name })}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                    {t('progress', {
                        progress: achievement.progress,
                        threshold: achievement.threshold,
                    })}
                </p>
            </div>
        </li>
    );
}
