'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { TeamMember } from '@/schemas/team-member';
import { useParams } from 'next/navigation';
import TeamMemberEditFormModal from '@/components/team-members/team-members-form-edit-modal';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { Id } from '@repo/backend/convex/_generated/dataModel';

export default function TeamMembersTable() {
    const t = useTranslations('TeamMembers');
    const { id: teamId } = useParams();
    const teamMembers = useSuspenseQuery(
        convexQuery(api.teamMembers.getTeamMembersByTeamId, { team: teamId as Id<'teams'> })
    );
    const deleteTeamMember = useMutation({
        mutationFn: useConvexMutation(api.teamMembers.deleteTeamMember),
        onSuccess: () => {
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

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
                            await deleteTeamMember.mutateAsync({
                                _id: row.original._id as Id<'teamMembers'>,
                            });
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
