import { OrganizationDetailClient } from '@/features/organizations';

export default async function Organization({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrganizationDetailClient organizationId={id} />;
}
