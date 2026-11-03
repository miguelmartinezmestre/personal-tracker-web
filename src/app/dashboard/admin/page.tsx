import { AdminPage } from '@/features/admin';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Admin', 'title');

export default function DashboardAdminPage() {
    return <AdminPage />;
}
