import { SettingsPage } from '@/features/settings';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'settings');

export default function DashboardSettingsPage() {
    return <SettingsPage />;
}
