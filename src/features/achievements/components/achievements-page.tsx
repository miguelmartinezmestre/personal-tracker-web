'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { AchievementCard } from '@/features/achievements/components/achievement-card';

export default function AchievementsPage() {
    const t = useTranslations('Achievements');
    const achievements = useQuery(convexQuery(api.achievements.getAchievements, {}));

    if (achievements.isError) {
        return <QueryErrorFallback onRetry={() => void achievements.refetch()} />;
    }

    if (!achievements.data) {
        return <Skeleton className="h-96 w-full" />;
    }

    const { userPoints, organizationPoints } = achievements.data;

    return (
        <div className="w-full min-w-0 space-y-6" data-testid="achievements-page">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            {t('userPoints')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold" data-testid="user-points">
                        {userPoints}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            {t('organizationPoints')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent
                        className="text-3xl font-semibold"
                        data-testid="organization-points"
                    >
                        {organizationPoints}
                    </CardContent>
                </Card>
            </div>
            {(['individual', 'organization'] as const).map(scope => (
                <section key={scope} className="space-y-3" data-testid={`achievements-${scope}`}>
                    <h2 className="text-xl font-semibold">{t(`scopes.${scope}`)}</h2>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {achievements.data.achievements
                            .filter(achievement => achievement.scope === scope)
                            .map(achievement => (
                                <AchievementCard key={achievement.code} achievement={achievement} />
                            ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
