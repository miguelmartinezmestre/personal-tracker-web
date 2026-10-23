import { AchievementsPage } from '@/features/achievements';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'achievements');

export default function DashboardAchievementsPage() {
    return <AchievementsPage />;
}
