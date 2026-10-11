import { OrganizationDetailClient } from '@/features/organizations';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'organizations');

export default async function Organization({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrganizationDetailClient organizationId={id} />;
}
