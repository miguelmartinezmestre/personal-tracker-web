'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/components/data-table/components/table';
import { useDeleteOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { Button } from '@/components/ui/button';
import { OrganizationMember } from '@/features/organizations/schemas/organization-member';
import OrganizationMemberEditFormModal from '@/features/organizations/components/organization-members-form-edit-modal';
import { useLocale, useTranslations } from 'next-intl';
import { useSession } from '@/features/auth/hooks/use-session';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
    isOrganizationAdminRole,
    isOrganizationOwnerRole,
    type OrganizationRoleValue,
} from '../types/roles';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';
import { formatDate } from '@/lib/format-date';

interface OrganizationMemberRaw {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: number;
    user?: { email?: string; name?: string; image?: string | null } | null;
}

interface OrganizationMembersTableProps {
    organizationId: string;
    actorRole?: OrganizationRoleValue;
}

export default function OrganizationMembersTable({
    organizationId,
    actorRole,
}: OrganizationMembersTableProps) {
    const t = useTranslations('OrganizationMembers');
    const locale = useLocale();
    const deleteOrganizationMember = useDeleteOrganizationMember();
    const session = useSession();
    const currentUserId = session.data?.user?.id;
    const canManageMembers = isOrganizationAdminRole(actorRole);
    const canManageOwners = isOrganizationOwnerRole(actorRole);

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(DEFAULT_PAGE_SIZE);

    const membersQuery = useQuery(
        convexQuery(
            api.organizations.getOrganizationMembers,
            organizationId
                ? { organizationId: organizationId as Id<'organization'>, paginationOpts }
                : 'skip'
        )
    );

    const continueCursor = membersQuery.data?.continueCursor ?? null;
    const pageIsDone = membersQuery.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const members: OrganizationMember[] = (membersQuery.data?.page ?? []).map(
        (member: OrganizationMemberRaw) => ({
            id: member.id,
            organizationId: member.organizationId,
            userId: member.userId,
            email: member.user?.email ?? '',
            role: member.role as OrganizationRoleValue,
            createdAt: new Date(member.createdAt),
        })
    );

    const columns: ColumnDef<DataTableFeatures, OrganizationMember>[] = [
        {
            accessorKey: 'email',
            header: t('email'),
        },
        {
            accessorKey: 'role',
            header: t('role'),
            cell: ({ row }) => t(`roles.${row.original.role}`),
        },
        {
            accessorKey: 'createdAt',
            header: t('joinedAt'),
            cell: ({ row }) => formatDate(row.original.createdAt, locale),
        },
        {
            header: t('edit'),
            id: 'edit',
            cell: ({ row }) => {
                const organizationMemberRow = row.original;
                const isCurrentUser = organizationMemberRow.userId === currentUserId;
                const canManageTarget =
                    canManageMembers &&
                    !isCurrentUser &&
                    (!isOrganizationOwnerRole(organizationMemberRow.role) || canManageOwners);

                return canManageTarget ? (
                    <OrganizationMemberEditFormModal
                        defaultValues={organizationMemberRow}
                        canAssignOwner={canManageOwners}
                    />
                ) : null;
            },
        },
        {
            header: t('delete'),
            id: 'delete',
            cell: ({ row }) => {
                const isCurrentUser = row.original.userId === currentUserId;
                const canManageTarget =
                    canManageMembers &&
                    (!isOrganizationOwnerRole(row.original.role) || canManageOwners);

                if (isCurrentUser || !canManageTarget) {
                    return null;
                }

                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            try {
                                await deleteOrganizationMember.mutateAsync({
                                    memberId: row.original.id,
                                    organizationId: organizationId,
                                });
                                toast.success(t('toast.deletedSuccess'));
                            } catch {
                                toast.error(t('toast.deleteFailed'));
                            }
                        }}
                        title={t('confirm.deleteTitle')}
                        description={t('confirm.deleteDescription')}
                        triggerLabel={t('delete')}
                        confirmLabel={t('confirm.deleteConfirm')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={deleteOrganizationMember.isPending}
                        trigger={
                            <Button variant="destructive" size="sm">
                                {t('delete')}
                            </Button>
                        }
                    />
                );
            },
        },
    ];

    return (
        <div data-testid="organization-members-table">
            <DataTable
                columns={columns}
                data={members}
                isLoading={membersQuery.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: membersQuery.isFetching,
                }}
            />
        </div>
    );
}
