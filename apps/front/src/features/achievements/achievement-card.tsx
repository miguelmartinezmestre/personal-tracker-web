'use client';

import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { Badge } from '@repo/ui/components/badge';
import { Progress } from '@repo/ui/components/progress';
import { cn } from '@repo/ui/lib/utils';
import { useTranslations } from 'next-intl';
import { AchievementBadge } from './achievement-badge';
import type { AchievementDefinition, AchievementTier } from '@/schemas/achievement';

const TIER_LABELS: Record<AchievementTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
};

const TIER_BADGE_VARIANTS: Record<AchievementTier, 'default' | 'secondary' | 'outline'> = {
    bronze: 'outline',
    silver: 'secondary',
    gold: 'default',
    platinum: 'default',
};

interface AchievementCardProps {
    definition: AchievementDefinition;
    currentProgress?: number;
    isEarned: boolean;
    earnedAt?: number;
    onClick?: () => void;
}

export function AchievementCard({
    definition,
    currentProgress = 0,
    isEarned,
    earnedAt,
    onClick,
}: AchievementCardProps) {
    const t = useTranslations('Achievements');

    const progressPercent = Math.min((currentProgress / definition.threshold) * 100, 100);

    const formattedEarnedDate = earnedAt ? new Date(earnedAt).toLocaleDateString() : null;

    return (
        <Card
            className={cn(
                'transition-all hover:shadow-md cursor-pointer',
                isEarned ? 'border-primary/50' : 'opacity-75'
            )}
            onClick={onClick}
            data-testid={`achievement-card-${definition.code}`}
        >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <AchievementBadge
                    icon={definition.icon}
                    tier={definition.tier as AchievementTier}
                    name={t(`definitions.${definition.code}.name`, {
                        defaultValue: definition.code,
                    })}
                    earned={isEarned}
                    size="lg"
                    showTooltip={false}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">
                            {t(`definitions.${definition.code}.name`, {
                                defaultValue: definition.code,
                            })}
                        </h3>
                        <Badge
                            variant={TIER_BADGE_VARIANTS[definition.tier as AchievementTier]}
                            className="text-xs"
                        >
                            {t(`tiers.${definition.tier}`, {
                                defaultValue: TIER_LABELS[definition.tier as AchievementTier],
                            })}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t(`definitions.${definition.code}.description`, {
                            threshold: definition.threshold,
                            defaultValue: `Reach ${definition.threshold}`,
                        })}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isEarned ? (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600 font-medium">{t('card.earned')}</span>
                            {formattedEarnedDate && (
                                <span className="text-muted-foreground">{formattedEarnedDate}</span>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t('card.progress')}</span>
                                <span className="font-medium">
                                    {currentProgress} / {definition.threshold}
                                </span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                        </>
                    )}
                    <div className="flex items-center justify-end">
                        <span className="text-xs font-medium text-primary">
                            {t('card.points', { points: definition.points })}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
