'use client';

import { useTranslations } from 'next-intl';
import { AchievementsWidget } from '@/features/achievements/components/achievements-widget';
import { api } from '@/convex/_generated/api';
import { Loader2 } from 'lucide-react';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';

export default function Home({
    preloadedUserQuery,
    preloadedUserAchievementStatsQuery,
    preloadedUserRecentAchievementsQuery,
}: {
    preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;
    preloadedUserAchievementStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
    preloadedUserRecentAchievementsQuery: Preloaded<typeof api.achievements.getRecentAchievements>;
}) {
    const user = usePreloadedAuthQuery(preloadedUserQuery);

    const t = useTranslations('DashboardHome');

    console.log(user);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{t('dashboardTitle')}</h1>
                <p data-testid="welcome-message" className="text-muted-foreground">
                    {!user ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        t('welcome', { name: user?.name ?? '' })
                    )}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="md:col-span-2 lg:col-span-1">
                    <AchievementsWidget
                        preloadedUserAchievementStatsQuery={preloadedUserAchievementStatsQuery}
                        preloadedUserRecentAchievementsQuery={preloadedUserRecentAchievementsQuery}
                    />
                </div>
            </div>
        </div>
    );
}
