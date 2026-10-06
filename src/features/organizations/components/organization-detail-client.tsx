'use client';

import {
    useOrganizationByIdentifier,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import CreateOrganizationMemberFormModal from '@/features/organizations/components/organization-members-form-create-modal';
import OrganizationMembersTable from '@/features/organizations/components/organization-members-table';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { isOrganizationAdminRole, isOrganizationOwnerRole } from '@/convex/utils';

function OrganizationInviteAction({
    organization,
}: {
    organization: Pick<Organization, 'id' | 'isPersonal' | 'role'>;
}) {
    const tMembers = useTranslations('OrganizationMembers');
    if (organization.isPersonal) {
        return (
            <p
                className="text-sm text-muted-foreground"
                data-testid="organization-personal-invite-restricted"
            >
                {tMembers('personalOrgInviteRestricted')}
            </p>
        );
    }
    if (isOrganizationAdminRole(organization.role)) {
        return (
            <CreateOrganizationMemberFormModal
                organizationId={organization.id}
                canAssignOwner={isOrganizationOwnerRole(organization.role)}
            />
        );
    }
    return null;
}

interface OrganizationDetailClientProps {
    organizationId: string;
}

export default function OrganizationDetailClient({
    organizationId,
}: OrganizationDetailClientProps) {
    const tMembers = useTranslations('OrganizationMembers');
    const {
        data: organization,
        isLoading,
        isError,
        refetch,
    } = useOrganizationByIdentifier(organizationId);

    if (isError) {
        return (
            <QueryErrorFallback
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }
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
                <p className="text-muted-foreground">{tMembers('organizationNotFound')}</p>
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
                    <OrganizationInviteAction organization={organization} />
                </div>
            </div>
            <section className="space-y-3" aria-labelledby="organization-members-heading">
                <h2 id="organization-members-heading" className="text-xl font-semibold">
                    {tMembers('title')}
                </h2>
                <OrganizationMembersTable
                    key={organization.id}
                    organizationId={organization.id}
                    actorRole={organization.role}
                />
            </section>
        </>
    );
}
