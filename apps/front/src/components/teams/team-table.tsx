'use client';

import { DataTable } from '@/components/table';
import { useTeams, useDeleteTeam } from '@/hooks/api/use-teams';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import EditTeamFormModal from '@/components/teams/team-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import type { Team } from '@/schemas/team';

export default function TeamsTable() {
    const t = useTranslations('Teams');
    const teams = useTeams();
    const deleteTeam = useDeleteTeam();

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
                return <EditTeamFormModal defaultValues={teamRow} />;
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
                            try {
                                await deleteTeam.mutateAsync({ id: teamRow.id });
                                toast.success(t('toast.deletedSuccess'));
                            } catch {
                                toast.error(t('toast.deleteFailed'));
                            }
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
                if (teamRow.id) {
                    return (
                        <Link
                            href={`/dashboard/teams/${String(teamRow.id)}`}
                            prefetch={false}
                            data-testid="team-detail-link"
                        >
                            {t('goToTeam')}
                        </Link>
                    );
                }

                return null;
            },
        },
    ];

    return (
        <div>
            <DataTable columns={columns} data={teams.data ?? []} isLoading={teams.isLoading} />
        </div>
    );
}
