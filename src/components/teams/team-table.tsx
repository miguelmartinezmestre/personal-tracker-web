'use client';

import { DataTable } from '@/components/table';
import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditTeamFormModal from '@/components/teams/team-form-edit-modal';
import { getQueryClient } from '@/trpc/client';
import { Team } from '@/schemas/team';

function t(key: string) {
    return key;
}

export default function TeamsTable() {
    const trpc = useTRPC();
    const queryClient = getQueryClient();
    const teams = useSuspenseQuery(trpc.teams.getTeams.queryOptions({}));
    const deleteTeam = useMutation(trpc.teams.deleteTeam.mutationOptions());

    const columns: ColumnDef<Team>[] = [
        {
            accessorKey: 'name',
            header: t('name'),
        },
        {
            accessorKey: 'description',
            header: t('description'),
        },
        {
            header: '',
            id: 'update-team',
            cell: ({ row }) => {
                const teamRow = row.original;
                return (
                    <EditTeamFormModal defaultValues={teamRow} />
                );
            },
        },
        {
            header: '',
            id: 'delete',
            cell: ({ row }) => {
                const teamRow = row.original;
                return (
                    <Button
                        onClick={async () => {
                            await deleteTeam.mutateAsync({ id: teamRow.id });
                            await queryClient.invalidateQueries(
                                trpc.teams.getTeams.queryOptions({})
                            );
                        }}
                    >
                        Delete
                    </Button>
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
            cell: ({ row }) => {
                const teamRow = row.original;
                if (teamRow.id) {
                    return (
                        <Link href={`/dashboard/teams/${teamRow.id}`} prefetch={false}>Go to team</Link>
                    );
                }

                return null;
            },
        },
    ];





    return (
        <div>
            <DataTable columns={columns} data={teams.data!} isLoading={teams.isLoading} />
        </div>
    );
}
