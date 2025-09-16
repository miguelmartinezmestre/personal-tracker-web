'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditTeamFormModal from '@/components/teams/team-form-edit-modal';
import { Team } from '@/schemas/team';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

export default function TeamsTable() {
    const t = useTranslations('Teams');
    const teams = useSuspenseQuery(convexQuery(api.teams.getTeams, {}));
    const deleteTeam = useMutation({ mutationFn: useConvexMutation(api.teams.deleteTeam) });

    const columns: ColumnDef<Team>[] = [
        {
            accessorKey: 'name',
            header: t('name'),
        },
        {
            accessorKey: 'description',
            header: t('tableDescription'),
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
                            await deleteTeam.mutateAsync({ id: teamRow.id as any });
                        }}
                    >
                        {t('deleteTeam')}
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
