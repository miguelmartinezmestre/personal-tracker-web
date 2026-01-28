'use client';

import { DataTable } from '@/features/table/components/table';
import {
    useDeleteOrganizationMember,
    useOrganizationMembers,
} from '@/features/organizations/hooks/use-organization-members';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { OrganizationMember } from '@/features/organizations/schemas/organization-member';
import OrganizationMemberEditFormModal from '@/features/organizations/components/organization-members-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { toast } from 'sonner';

interface OrganizationMembersTableProps {
    organizationId: string;
}

export default function OrganizationMembersTable({
    organizationId,
}: OrganizationMembersTableProps) {
    const t = useTranslations('OrganizationMembers');
    const organizationMembers = useOrganizationMembers(organizationId);
    const deleteOrganizationMember = useDeleteOrganizationMember();

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
                data={organizationMembers.data!}
                isLoading={organizationMembers.isLoading}
            />
        </div>
    );
}
