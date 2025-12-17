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

export default function TeamMembersTable() {
    const t = useTranslations('TeamMembers');
    const { id: teamId } = useParams();
    const teamMembers = useSuspenseQuery(
        convexQuery(api.teamMembers.getTeamMembersByTeamId, { team: teamId as Id<'teams'> })
    );
    const deleteTeamMember = useMutation({
        mutationFn: useConvexMutation(api.teamMembers.deleteTeamMember),
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
                    <Button
                        onClick={async () => {
                            await deleteTeamMember.mutateAsync({
                                _id: row.original._id as Id<'teamMembers'>,
                            });
                        }}
                    >
                        {t('delete')}
                    </Button>
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
