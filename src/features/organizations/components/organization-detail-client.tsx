'use client';

import {
    useOrganizationByIdentifier,
    type Organization,
} from '@/features/organizations/hooks/use-organizations';
import CreateOrganizationMemberFormModal from '@/features/organizations/components/organization-members-form-create-modal';
import OrganizationMembersTable from '@/features/organizations/components/organization-members-table';
import OrganizationPendingInvitations from '@/features/organizations/components/organization-pending-invitations';
import OrganizationLeaveButton from '@/features/organizations/components/organization-leave-button';
import Link from 'next/link';
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
    const tOrganizations = useTranslations('Organizations');
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
            <div className="space-y-3 py-8 text-center" data-testid="organization-detail-empty">
                <p className="text-muted-foreground">{tMembers('organizationNotFound')}</p>
                <Link
                    href="/dashboard/organizations"
                    prefetch={false}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                >
                    {tMembers('backToOrganizations')}
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 text-2xl font-bold" data-testid="organization-detail-title">
                    {organization.isPersonal
                        ? tOrganizations('personalOrganizationName')
                        : organization.name}
                </h1>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <OrganizationInviteAction organization={organization} />
                    {!organization.isPersonal && (
                        <OrganizationLeaveButton
                            organizationId={organization.id}
                            organizationName={organization.name}
                        />
                    )}
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
            {!organization.isPersonal && isOrganizationAdminRole(organization.role) && (
                <div className="mt-8">
                    <OrganizationPendingInvitations organizationId={organization.id} />
                </div>
            )}
        </>
    );
}
