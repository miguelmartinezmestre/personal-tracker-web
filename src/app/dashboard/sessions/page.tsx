import { SessionsPage } from '@/features/sessions';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'sessions');

export default function DashboardSessionsPage() {
    return <SessionsPage />;
}
