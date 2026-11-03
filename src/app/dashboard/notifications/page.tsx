import { NotificationsPage } from '@/features/notifications';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'notifications');

export default function DashboardNotificationsPage() {
    return <NotificationsPage />;
}
