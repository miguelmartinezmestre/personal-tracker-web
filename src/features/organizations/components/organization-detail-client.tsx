'use client';

import {
    useOrganizationByIdentifier,
    useOrganizations,
} from '@/features/organizations/hooks/use-organizations';
import CreateOrganizationMemberFormModal from '@/features/organizations/components/organization-members-form-create-modal';
import OrganizationMembersTable from '@/features/organizations/components/organization-members-table';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationDetailClientProps {
    organizationId: string;
}

export default function OrganizationDetailClient({
    organizationId,
}: OrganizationDetailClientProps) {
    // Use organization hook to get organization by ID
    const { data: organization, isLoading } = useOrganizationByIdentifier(organizationId);

    if (isLoading) {
        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-64 w-full" />
            </>
        );
    }

    if (!organization) {
        return (
            <div className="text-center py-8" data-testid="organization-detail-empty">
                <p className="text-muted-foreground">Organization not found</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold" data-testid="organization-detail-title">
                    {organization.name}{' '}
                    <span className="text-sm text-muted-foreground">({organization.slug})</span>
                </h1>
                <CreateOrganizationMemberFormModal organizationId={organization.id} />
            </div>
            <OrganizationMembersTable organizationId={organization.id} />
        </>
    );
}
