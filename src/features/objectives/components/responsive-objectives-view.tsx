'use client';

import * as React from 'react';
import Link from 'next/link';
import { Preloaded } from 'convex/react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { invalidateObjectiveListQueries } from '@/features/objectives/lib/objective-query-invalidation';

export const ResponsiveObjectivesView = React.forwardRef<
    HTMLDivElement,
    {
        preloadedPersonalObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser>;
        preloadedOrganizationObjectivesQuery: Preloaded<
            typeof api.objectives.getOrganizationObjectives
        >;
    }
>(({ preloadedPersonalObjectivesQuery, preloadedOrganizationObjectivesQuery }, ref) => {
    const t = useTranslations('Objectives');
    const queryClient = useQueryClient();
    const { filters, hasSearch, categories, handleFiltersChange, personal, organization } =
        useObjectiveListState({
            preloadedPersonalObjectivesQuery,
            preloadedOrganizationObjectivesQuery,
        });

    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: async () => {
            await invalidateObjectiveListQueries(queryClient);
        },
    });

    const statusLabels = {
        active: t('statusOptions.active'),
        completed: t('statusOptions.completed'),
        overdue: t('statusLabels.overdue'),
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
            accessorKey: 'category',
            header: t('category'),
            cell: ({ row }) => row.original.category?.trim() || '-',
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
                        {objective.category ? (
                            <Badge variant="secondary">{objective.category}</Badge>
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
                    <h2 className="text-xl font-semibold">{t('sections.personal')}</h2>
                    <Badge variant="secondary">{personal.objectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {personal.objectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {personal.objectives.map(renderObjectiveCard)}
                        </div>
                    )}
                    {!hasSearch && (
                        <MobilePagination
                            pagination={personal.pagination}
                            rowCount={personal.objectives.length}
                            hasNextPage={personal.hasNextPage}
                            isLoading={personal.isFetching}
                            onNextPage={personal.onNextPage}
                        />
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable
                        columns={objectiveColumns}
                        data={personal.objectives}
                        isLoading={personal.isLoading}
                        pagination={
                            hasSearch
                                ? undefined
                                : {
                                      currentPage: personal.pagination.currentPage,
                                      onNextPage: personal.onNextPage,
                                      onPreviousPage: personal.pagination.previousPage,
                                      hasNextPage: personal.hasNextPage,
                                      hasPreviousPage: personal.pagination.hasPreviousPage,
                                      isLoading: personal.isFetching,
                                  }
                        }
                    />
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('sections.organization')}</h2>
                    <Badge variant="secondary">{organization.objectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {organization.objectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {organization.objectives.map(renderObjectiveCard)}
                        </div>
                    )}
                    {!hasSearch && (
                        <MobilePagination
                            pagination={organization.pagination}
                            rowCount={organization.objectives.length}
                            hasNextPage={organization.hasNextPage}
                            isLoading={organization.isFetching}
                            onNextPage={organization.onNextPage}
                        />
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable
                        columns={objectiveColumns}
                        data={organization.objectives}
                        isLoading={organization.isLoading}
                        pagination={
                            hasSearch
                                ? undefined
                                : {
                                      currentPage: organization.pagination.currentPage,
                                      onNextPage: organization.onNextPage,
                                      onPreviousPage: organization.pagination.previousPage,
                                      hasNextPage: organization.hasNextPage,
                                      hasPreviousPage: organization.pagination.hasPreviousPage,
                                      isLoading: organization.isFetching,
                                  }
                        }
                    />
                </div>
            </section>
        </div>
    );
});

ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';
