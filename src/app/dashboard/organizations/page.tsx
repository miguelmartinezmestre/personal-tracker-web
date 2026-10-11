import { OrganizationsLayout } from '@/features/organizations';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'organizations');

export default function OrganizationsPage() {
    return <OrganizationsLayout />;
}
