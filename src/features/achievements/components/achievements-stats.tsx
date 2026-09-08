'use client';

import { useTranslations } from 'next-intl';
import { Star, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type AchievementsStatsProps = {
    totalPoints: number;
    earnedCount: number;
    totalAvailable: number;
};

export function AchievementsStats({
    totalPoints,
    earnedCount,
    totalAvailable,
}: AchievementsStatsProps) {
    const t = useTranslations('Achievements');
    const completionPercent =
        totalAvailable > 0 ? Math.round((earnedCount / totalAvailable) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="achievements-stats">
            <Card data-testid="achievements-points-card">
                <CardContent className="flex items-center gap-4 p-6">
                    <Star className="h-10 w-10 text-yellow-500" />
                    <div>
                        <p className="text-3xl font-bold" data-testid="achievements-total-points">
                            {totalPoints}
                        </p>
                        <p className="text-sm text-muted-foreground">{t('stats.totalPoints')}</p>
                    </div>
                </CardContent>
            </Card>
            <Card data-testid="achievements-earned-card">
                <CardContent className="flex items-center gap-4 p-6">
                    <Award className="h-10 w-10 text-primary" />
                    <div>
                        <p className="text-3xl font-bold" data-testid="achievements-earned-count">
                            {earnedCount}
                            <span className="text-lg font-normal text-muted-foreground">
                                /{totalAvailable}
                            </span>
                        </p>
                        <p className="text-sm text-muted-foreground">{t('stats.earned')}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="flex items-center gap-4 p-6">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{completionPercent}%</span>
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
    );
}
