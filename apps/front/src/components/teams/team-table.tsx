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
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';

export default function TeamsTable() {
    const t = useTranslations('Teams');
    const teams = useSuspenseQuery(convexQuery(api.teams.getTeams, {}));
    const deleteTeam = useMutation({
        mutationFn: useConvexMutation(api.teams.deleteTeam),
        onSuccess: () => {
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

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
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            await deleteTeam.mutateAsync({ _id: teamRow._id });
                        }}
                        title={t('confirm.deleteTeam')}
                        description={t('confirm.deleteTeamDescription')}
                        triggerLabel={t('deleteTeam')}
                        confirmLabel={t('confirm.deleteConfirm')}
                        cancelLabel={t('confirm.cancel')}
                        isLoading={deleteTeam.isPending}
                        trigger={
                            <Button
                                data-testid="team-delete-button"
                                variant="destructive"
                                size="sm"
                            >
                                {t('deleteTeam')}
                            </Button>
                        }
                    />
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
