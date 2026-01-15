import { api } from '@repo/backend/convex/_generated/api';
import Home from '@/features/dashboard/components/home';
import { preloadAuthQuery } from '@/features/auth/auth-server';

export default async function HomePage() {

    const [preloadedUserQuery, preloadedUserAchievementStatsQuery, preloadedUserRecentAchievementsQuery] = await Promise.all([
        preloadAuthQuery(api.auth.getCurrentUser),
        preloadAuthQuery(api.achievements.getUserAchievementStats),
        preloadAuthQuery(api.achievements.getRecentAchievements, { limit: 5 }),
      ]);

    return (
        <Home preloadedUserQuery={preloadedUserQuery} preloadedUserAchievementStatsQuery={preloadedUserAchievementStatsQuery} preloadedUserRecentAchievementsQuery={preloadedUserRecentAchievementsQuery} />
    );
}
