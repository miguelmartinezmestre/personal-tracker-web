'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatCivilDate } from '@/lib/format-date';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { computeObjectiveProgressPercent } from './objectives-utils';
import { ObjectiveRowActions } from './objective-row-actions';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';

type StatusLabels = {
    active: string;
    completed: string;
    overdue: string;
};

export function useObjectiveTableColumns({
    categoryNameById,
    onEdit,
}: {
    categoryNameById: Map<string, string>;
    onEdit: (objectiveId: ObjectiveWithCapabilities['_id']) => void;
}): ColumnDef<DataTableFeatures, ObjectiveWithCapabilities>[] {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    const statusLabels: StatusLabels = {
        active: t('statusOptions.active'),
        completed: t('statusOptions.completed'),
        overdue: t('statusOptions.overdue'),
    };

    return [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            accessorKey: 'description',
            header: t('tableDescription'),
            cell: ({ row }) => (
                <div className="max-w-sm truncate text-muted-foreground">
                    {row.original.description?.trim() || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'categoryId',
            header: t('category'),
            cell: ({ row }) =>
                (row.original.categoryId && categoryNameById.get(row.original.categoryId)) || '-',
        },
        {
            accessorKey: 'deadline',
            header: t('deadline'),
            cell: ({ row }) =>
                row.original.deadline ? formatCivilDate(row.original.deadline, locale) : '-',
        },
        {
            id: 'status',
            header: t('status'),
            cell: ({ row }) => (
                <StatusIndicator
                    status={row.original.status}
                    deadline={row.original.deadline ?? undefined}
                    labels={statusLabels}
                />
            ),
        },
        {
            id: 'progress',
            header: t('progress'),
            cell: ({ row }) => {
                const objective = row.original;
                const progress = computeObjectiveProgressPercent({
                    currentValue: objective.currentValue,
                    targetValue: objective.targetValue,
                    startValue: objective.startValue,
                });

                return (
                    <div className="flex items-center gap-3">
                        <CircularProgress
                            aria-label={`${t('progress')}: ${objective.title}`}
                            value={progress}
                        />
                        <span className="text-sm text-muted-foreground">
                            {objective.currentValue}/{objective.targetValue} {objective.unit ?? ''}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: t('quickActions'),
            cell: ({ row }) => <ObjectiveRowActions objective={row.original} onEdit={onEdit} />,
        },
    ];
}
