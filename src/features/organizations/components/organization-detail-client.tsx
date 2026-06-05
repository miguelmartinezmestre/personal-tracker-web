'use client';

import { useOrganizationByIdentifier } from '@/features/organizations/hooks/use-organizations';
import CreateOrganizationMemberFormModal from '@/features/organizations/components/organization-members-form-create-modal';
import OrganizationMembersTable from '@/features/organizations/components/organization-members-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

interface OrganizationDetailClientProps {
    organizationId: string;
}

export default function OrganizationDetailClient({
    organizationId,
}: OrganizationDetailClientProps) {
    const tMembers = useTranslations('OrganizationMembers');
    const { data: organization, isLoading } = useOrganizationByIdentifier(organizationId);

    if (isLoading) {
        return (
            <>
                <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 text-2xl font-bold" data-testid="organization-detail-title">
                    {organization.name}{' '}
                    <span className="text-sm text-muted-foreground">({organization.slug})</span>
                </h1>
                <div className="w-full sm:w-auto">
                    {organization.isPersonal ? (
                        <p
                            className="text-sm text-muted-foreground"
                            data-testid="organization-personal-invite-restricted"
                        >
                            {tMembers('personalOrgInviteRestricted')}
                        </p>
                    ) : (
                        <CreateOrganizationMemberFormModal organizationId={organization.id} />
                    )}
                </div>
            </div>
            <section className="space-y-3" aria-labelledby="organization-members-heading">
                <h2 id="organization-members-heading" className="text-xl font-semibold">
                    {tMembers('title')}
                </h2>
                <OrganizationMembersTable key={organization.id} organizationId={organization.id} />
            </section>
        </>
    );
}
