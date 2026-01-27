import { api } from '@/convex/_generated/api';
import Home from '@/features/dashboard/components/home';
import { preloadAuthQuery } from '@/features/auth/auth-server';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function HomePage() {

    let preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;
    let preloadedUserAchievementStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
    let preloadedUserRecentAchievementsQuery: Preloaded<typeof api.achievements.getRecentAchievements>;

    try {
        [preloadedUserQuery, preloadedUserAchievementStatsQuery, preloadedUserRecentAchievementsQuery] = await Promise.all([
            preloadAuthQuery(api.auth.getCurrentUser),
            preloadAuthQuery(api.achievements.getUserAchievementStats),
            preloadAuthQuery(api.achievements.getRecentAchievements, { limit: 5 }),
        ]);
    } catch (error) {
        console.error(error);
        redirect('/login');
    }
    return (
        <Home preloadedUserQuery={preloadedUserQuery} preloadedUserAchievementStatsQuery={preloadedUserAchievementStatsQuery} preloadedUserRecentAchievementsQuery={preloadedUserRecentAchievementsQuery} />
    );
}
