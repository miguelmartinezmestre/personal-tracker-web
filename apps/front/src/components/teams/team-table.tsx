'use client';

import { DataTable } from '@/components/table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import EditTeamFormModal from '@/components/teams/team-form-edit-modal';
import { useTranslations } from 'next-intl';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc } from '@repo/backend/convex/_generated/dataModel';

export default function TeamsTable() {
    const t = useTranslations('Teams');
    const teams = useSuspenseQuery(convexQuery(api.teams.getTeams, {}));
    const deleteTeam = useMutation({ mutationFn: useConvexMutation(api.teams.deleteTeam) });

    const columns: ColumnDef<Doc<"organization">>[] = [
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
                            await deleteTeam.mutateAsync({ _id: teamRow._id });
                        }}
                        data-testid="team-delete-button"
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
                if (teamRow._id) {
                    return (
                        <Link href={`/dashboard/teams/${String(teamRow._id)}`} prefetch={false} data-testid="team-detail-link">
                            Go to team
                        </Link>
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
