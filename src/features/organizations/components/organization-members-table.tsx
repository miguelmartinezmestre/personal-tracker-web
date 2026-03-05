'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/features/table/components/table';
import { useDeleteOrganizationMember } from '@/features/organizations/hooks/use-organization-members';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { OrganizationMember } from '@/features/organizations/schemas/organization-member';
import OrganizationMemberEditFormModal from '@/features/organizations/components/organization-members-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { OrganizationRole } from '../types/roles';

const DEFAULT_PAGE_SIZE = 20;

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
}

export default function OrganizationMembersTable({
    organizationId,
}: OrganizationMembersTableProps) {
    const t = useTranslations('OrganizationMembers');
    const deleteOrganizationMember = useDeleteOrganizationMember();
    const [activeOrganizationId, setActiveOrganizationId] = useState(organizationId);

    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
        reset,
    } = useServerPagination(DEFAULT_PAGE_SIZE);

    useEffect(() => {
        setActiveOrganizationId(organizationId);
        reset();
    }, [organizationId, reset]);

    const paginationOpts = getPaginationOpts(currentPage);
    const isSyncingOrganization = activeOrganizationId !== organizationId;

    const membersQuery = useQuery(
        convexQuery(
            api.organizations.getOrganizationMembers,
            !isSyncingOrganization && activeOrganizationId
                ? { organizationId: activeOrganizationId, paginationOpts }
                : 'skip'
        )
    );

    const hasData = membersQuery.data !== undefined;
    const continueCursor = membersQuery.data?.continueCursor ?? null;
    const pageIsDone = membersQuery.data?.isDone ?? false;

    useEffect(() => {
        if (isSyncingOrganization || !hasData || membersQuery.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [
        currentPage,
        hasData,
        continueCursor,
        pageIsDone,
        isSyncingOrganization,
        membersQuery.isFetching,
        updateCursor,
    ]);

    const members: OrganizationMember[] = (membersQuery.data?.page ?? []).map(
        (member: OrganizationMemberRaw) => ({
            id: member.id,
            organizationId: member.organizationId,
            userId: member.userId,
            email: member.user?.email ?? '',
            role: member.role as OrganizationRole,
            createdAt: new Date(member.createdAt),
        })
    );

    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    const columns: ColumnDef<OrganizationMember>[] = [
        {
            accessorKey: 'email',
            header: t('email'),
        },
        {
            accessorKey: 'role',
            header: t('role'),
        },
        {
            header: t('edit'),
            id: 'edit',
            cell: ({ row }) => {
                const organizationMemberRow = row.original;
                return <OrganizationMemberEditFormModal defaultValues={organizationMemberRow} />;
            },
        },
        {
            header: t('delete'),
            id: 'delete',
            cell: ({ row }) => {
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
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
                }}
            />
        </div>
    );
}
