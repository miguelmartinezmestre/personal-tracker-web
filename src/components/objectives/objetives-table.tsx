'use client';

import { DataTable } from '@/components/table';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
    Objective,
} from '@/schemas/objective';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import EditObjectiveFormModal from '@/components/objectives/objective-form-edit-modal';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import { useTranslations } from 'next-intl';

export default function ObjetivesTable() {
    const t = useTranslations('Objectives');
    const { data: objectives, isLoading } = useQuery(convexQuery(api.objectives.getObjectivesByUser, {}));
    const deleteObjective = useMutation({ mutationFn: useConvexMutation(api.objectives.deleteObjective) });

    const columns: ColumnDef<Objective>[] = [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            accessorKey: 'description',
            header: t('tableDescription'),
        },
        {
            accessorKey: 'targetValue',
            header: t('targetValue'),
        },
        {
            accessorKey: 'currentValue',
            header: t('currentValue'),
        },
        {
            accessorKey: 'deadline',
            header: t('deadline'),
            cell: ({ row }) => {
                const objective = row.original;
                return objective.deadline ? new Date(objective.deadline).toLocaleDateString() : '';
            },
        },
        {
            accessorKey: 'status',
            header: t('status'),
        },
        {
            header: '',
            id: 'update-objective',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <EditObjectiveFormModal defaultValues={objetiveRow} />
                );
            },
        },
        {
            header: '',
            id: 'delete',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <Button
                        onClick={async () => {
                            await deleteObjective.mutateAsync({ id: objetiveRow.id as any });
                        }}
                    >
                        {t('deleteObjective')}
                    </Button>
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
            cell: ({ row }) => {
                const objetiveRow = row.original;
                if (objetiveRow.id) {
                    return (
                        <Link href={`/dashboard/objectives/${objetiveRow.id}`} prefetch={false}>{t('goToProgress')}</Link>
                    );
                }

                return null;
            },
        },
    ];





    return (
        <div>
            <DataTable columns={columns} data={objectives ?? []} isLoading={isLoading} />
        </div>
    );
}
