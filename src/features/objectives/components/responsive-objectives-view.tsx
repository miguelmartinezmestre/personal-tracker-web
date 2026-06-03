'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { DataTable } from '@/components/data-table/components/table';
import { ObjectivesFilters } from './objective-filters';
import { computeObjectiveProgressPercent, normalizeObjective } from './objectives-utils';
import { MobilePagination } from './mobile-pagination';
import { useObjectiveListState } from '@/features/objectives/hooks/use-objective-list-state';

export const ResponsiveObjectivesView = React.forwardRef<HTMLDivElement, object>((_props, ref) => {
    const t = useTranslations('Objectives');
    const {
        filters,
        hasSearch,
        categories,
        categoryNameById,
        handleFiltersChange,
        objectives,
        pagination,
        hasNextPage,
        isLoading,
        isFetching,
        onNextPage,
    } = useObjectiveListState();

    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });

    const statusLabels = {
        active: t('statusOptions.active'),
        completed: t('statusOptions.completed'),
        overdue: t('statusOptions.overdue'),
    };

    const renderObjectiveActions = (objective: Doc<'objectives'>) => (
        <div className="flex flex-wrap gap-2">
            <EditObjectiveFormModal defaultValues={normalizeObjective(objective)} />
            <DeleteConfirmationDialog
                onConfirm={async () => {
                    await deleteObjectiveMutation.mutateAsync({ id: objective._id });
                }}
                title={t('confirm.deleteObjective')}
                description={t('confirm.deleteObjectiveDescription')}
                triggerLabel={t('deleteObjective')}
                confirmLabel={t('confirm.deleteConfirm')}
                cancelLabel={t('confirm.cancel')}
                isLoading={deleteObjectiveMutation.isPending}
                trigger={
                    <Button data-testid="objective-delete-button" variant="destructive" size="sm">
                        {t('deleteObjective')}
                    </Button>
                }
            />
            <Link
                href={`/dashboard/objectives/${objective._id}`}
                prefetch={false}
                data-testid="objective-progress-link"
                className="inline-flex"
            >
                <Button variant="outline" size="sm">
                    {t('goToProgress')}
                </Button>
            </Link>
        </div>
    );

    const objectiveColumns: ColumnDef<Doc<'objectives'>>[] = [
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
                row.original.deadline ? new Date(row.original.deadline).toLocaleDateString() : '-',
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
                const normalized = normalizeObjective(objective);
                const progress = computeObjectiveProgressPercent({
                    currentValue: normalized.currentValue,
                    targetValue: normalized.targetValue,
                    startValue: normalized.startValue,
                });

                return (
                    <div className="flex items-center gap-3">
                        <CircularProgress value={progress} max={100} size="sm" />
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
            cell: ({ row }) => renderObjectiveActions(row.original),
        },
    ];

    const renderObjectiveCard = (objective: Doc<'objectives'>) => {
        const normalized = normalizeObjective(objective);
        const progress = computeObjectiveProgressPercent({
            currentValue: normalized.currentValue,
            targetValue: normalized.targetValue,
            startValue: normalized.startValue,
        });

        return (
            <Card key={objective._id} className="w-full">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{objective.title}</p>
                            {objective.description ? (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {objective.description}
                                </p>
                            ) : null}
                        </div>
                        <StatusIndicator
                            status={objective.status}
                            deadline={objective.deadline ?? undefined}
                            labels={statusLabels}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <CircularProgress value={progress} max={100} size="sm" />
                        <div className="text-sm text-muted-foreground">
                            {objective.currentValue}/{objective.targetValue} {objective.unit ?? ''}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {objective.categoryId && categoryNameById.get(objective.categoryId) ? (
                            <Badge variant="secondary">
                                {categoryNameById.get(objective.categoryId)}
                            </Badge>
                        ) : null}
                        {objective.deadline ? (
                            <Badge variant="outline">
                                {new Date(objective.deadline).toLocaleDateString()}
                            </Badge>
                        ) : null}
                    </div>

                    {renderObjectiveActions(objective)}
                </CardContent>
            </Card>
        );
    };

    return (
        <div ref={ref} className="w-full min-w-0 space-y-4">
            <ObjectivesFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                categories={categories}
                className="w-full"
            />

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('title')}</h2>
                    <Badge variant="secondary">{objectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {objectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {objectives.map(renderObjectiveCard)}
                        </div>
                    )}
                    {!hasSearch && (
                        <MobilePagination
                            pagination={pagination}
                            rowCount={objectives.length}
                            hasNextPage={hasNextPage}
                            isLoading={isFetching}
                            onNextPage={onNextPage}
                        />
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable
                        columns={objectiveColumns}
                        data={objectives}
                        isLoading={isLoading}
                        pagination={
                            hasSearch
                                ? undefined
                                : {
                                      currentPage: pagination.currentPage,
                                      onNextPage: onNextPage,
                                      onPreviousPage: pagination.previousPage,
                                      hasNextPage: hasNextPage,
                                      hasPreviousPage: pagination.hasPreviousPage,
                                      isLoading: isFetching,
                                  }
                        }
                    />
                </div>
            </section>
        </div>
    );
});

ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';
