import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import AchievementsLayout from '@/features/achievements/components/achievements-layout';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function AchievementsPage() {

    let preloadedStatsQuery: Preloaded<typeof api.achievements.getUserAchievementStats>;
    let preloadedProgressQuery: Preloaded<typeof api.achievements.getUserAchievementProgress>;
    
    try{
        [preloadedStatsQuery, preloadedProgressQuery] = await Promise.all([
            preloadAuthQuery(api.achievements.getUserAchievementStats, {}),
            preloadAuthQuery(api.achievements.getUserAchievementProgress, {}),
        ]);
    }catch(error){
        console.error(error);
        redirect('/dashboard/home');
    }

    return (
        <AchievementsLayout
            preloadedStatsQuery={preloadedStatsQuery}
            preloadedProgressQuery={preloadedProgressQuery}
        />
    );
}
