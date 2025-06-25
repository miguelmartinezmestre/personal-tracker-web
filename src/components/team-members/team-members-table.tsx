'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { getQueryClient } from '@/trpc/client';
import { TeamMember } from '@/schemas/team-member';
import { useParams } from 'next/navigation';
import TeamMemberEditFormModal from '@/components/team-members/team-members-form-edit-modal';
import { useTranslations } from 'next-intl';

function t(key: string) {
    return key;
}

export default function TeamMembersTable() {
    const t = useTranslations('TeamMembers');
    const {id: teamId} = useParams();
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const teamMembers = useSuspenseQuery(trpc.teamMembers.getTeamMembersByTeamId.queryOptions({ teamId: Number(teamId) }));
    const deleteTeamMember = useMutation(trpc.teamMembers.deleteTeamMember.mutationOptions());

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
                const objetiveRow = row.original;
                return (
                    <TeamMemberEditFormModal defaultValues={objetiveRow} />
                );
            },
        },
        {
            header: t('delete'),
            id: 'delete',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={async () => {
                            await deleteTeamMember.mutateAsync({ id: objetiveRow.id });
                            queryClient.invalidateQueries(trpc.teamMembers.getTeamMembersByTeamId.queryOptions({ teamId: Number(teamId) }));
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
            <DataTable columns={columns} data={teamMembers.data!} isLoading={teamMembers.isLoading} />
        </div>
    );
}
