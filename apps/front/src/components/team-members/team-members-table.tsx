'use client';

import { DataTable } from '@/components/table';
import { useDeleteTeamMember, useTeamMembers } from '@/hooks/api/use-team-members';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { TeamMember } from '@/schemas/team-member';
import { useParams } from 'next/navigation';
import TeamMemberEditFormModal from '@/components/team-members/team-members-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';

export default function TeamMembersTable() {
    const t = useTranslations('TeamMembers');
    const { id } = useParams();
    const teamId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
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
                                    organizationId: teamId ?? undefined,
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
