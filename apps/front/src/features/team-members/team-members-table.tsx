'use client';

import { DataTable } from '@/features/data-table/table';
import { useDeleteTeamMember, useTeamMembers } from '@/features/team-members/use-team-members';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { TeamMember } from '@/features/team-members/team-member';
import TeamMemberEditFormModal from '@/features/team-members/team-members-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/features/data-table/delete-confirmation-dialog';
import { toast } from 'sonner';

interface TeamMembersTableProps {
    teamId: string;
}

export default function TeamMembersTable({ teamId }: TeamMembersTableProps) {
    const t = useTranslations('TeamMembers');
    const teamMembers = useTeamMembers(teamId);
    const deleteTeamMember = useDeleteTeamMember();

    const columns: ColumnDef<TeamMember>[] = [
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
                const teamMemberRow = row.original;
                return <TeamMemberEditFormModal defaultValues={teamMemberRow} />;
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
                                await deleteTeamMember.mutateAsync({
                                    memberId: row.original.id,
                                    organizationId: teamId,
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
                        isLoading={deleteTeamMember.isPending}
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
        <div>
            <DataTable
                columns={columns}
                data={teamMembers.data!}
                isLoading={teamMembers.isLoading}
            />
        </div>
    );
}
