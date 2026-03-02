import { api } from '@/convex/_generated/api';
import Home from '@/features/dashboard/components/home';
import { preloadAuthQuery } from '@/features/auth/auth-server';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function HomePage() {
  let preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;
  let preloadedUserAchievementStatsQuery: Preloaded<
    typeof api.achievements.getUserAchievementStats
  >;
  let preloadedUserRecentAchievementsQuery: Preloaded<
    typeof api.achievements.getRecentAchievements
  >;
  let preloadedDashboardStatsQuery: Preloaded<typeof api.dashboard.getDashboardStats>;
  let preloadedUpcomingDeadlinesQuery: Preloaded<typeof api.dashboard.getUpcomingDeadlines>;
  let preloadedRecentActivityQuery: Preloaded<typeof api.dashboard.getRecentActivity>;

  try {
    [
      preloadedUserQuery,
      preloadedUserAchievementStatsQuery,
      preloadedUserRecentAchievementsQuery,
      preloadedDashboardStatsQuery,
      preloadedUpcomingDeadlinesQuery,
      preloadedRecentActivityQuery,
    ] = await Promise.all([
      preloadAuthQuery(api.auth.getCurrentUser),
      preloadAuthQuery(api.achievements.getUserAchievementStats),
      preloadAuthQuery(api.achievements.getRecentAchievements, { limit: 5 }),
      preloadAuthQuery(api.dashboard.getDashboardStats),
      preloadAuthQuery(api.dashboard.getUpcomingDeadlines, {}),
      preloadAuthQuery(api.dashboard.getRecentActivity, {}),
    ]);
  } catch (error) {
    console.error(error);
    redirect('/login');
  }

  return (
    <Home
      preloadedUserQuery={preloadedUserQuery}
      preloadedUserAchievementStatsQuery={preloadedUserAchievementStatsQuery}
      preloadedUserRecentAchievementsQuery={preloadedUserRecentAchievementsQuery}
      preloadedDashboardStatsQuery={preloadedDashboardStatsQuery}
      preloadedUpcomingDeadlinesQuery={preloadedUpcomingDeadlinesQuery}
      preloadedRecentActivityQuery={preloadedRecentActivityQuery}
    />
  );
}
