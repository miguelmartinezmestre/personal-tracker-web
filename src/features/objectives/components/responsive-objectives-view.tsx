'use client';

import * as React from 'react';
import Link from 'next/link';
import { Preloaded } from 'convex/react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useConvexMutation } from '@convex-dev/react-query';
import { usePreloadedQuery } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StatusIndicator } from '@/components/ui/status-indicator';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { DataTable } from '@/features/table/components/table';
import { ObjectivesFilters, type FilterOptions } from './objective-filters';
import { computeObjectiveProgressPercent, normalizeObjective } from './objectives-utils';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { MobilePagination } from './mobile-pagination';
import type { ObjectiveStatus } from '@/convex/utils/constants';
import { invalidateConvexQuery } from '@/features/convex/query-keys';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: { numItems: DEFAULT_PAGE_SIZE, cursor: null },
};

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

type PersonalResult = FunctionReturnType<typeof api.objectives.getObjectivesByUser>;
type OrgResult = FunctionReturnType<typeof api.objectives.getOrganizationObjectives>;
type DeadlineRange = 'today' | 'week' | 'month' | 'overdue';

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

    const [filters, setFilters] = React.useState<FilterOptions>(() => ({ ...DEFAULT_FILTERS }));
    const searchText = filters.search.trim();
    const hasSearch = searchText.length > 0;
    const statusFilter = filters.status !== 'all' ? (filters.status as ObjectiveStatus) : undefined;
    const categoryFilter = filters.category !== 'all' ? filters.category : undefined;
    const deadlineRangeFilter =
        filters.deadlineRange !== 'all' ? (filters.deadlineRange as DeadlineRange) : undefined;

    const preloadedPersonal = usePreloadedQuery(preloadedPersonalObjectivesQuery) as
        | PersonalResult
        | undefined;
    const preloadedOrg = usePreloadedQuery(preloadedOrganizationObjectivesQuery) as
        | OrgResult
        | undefined;

    const personalPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: personalPaginationOpts, reset: resetPersonalPagination } =
        personalPagination;
    const personalIsFirstPage = personalPaginationOpts.cursor === null;

    const personalQuery = useQuery({
        ...convexQuery(
            api.objectives.getObjectivesByUser,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: personalPaginationOpts,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        ),
        initialData:
            !hasSearch &&
            personalIsFirstPage &&
            filters.status === 'all' &&
            filters.category === 'all' &&
            filters.deadlineRange === 'all'
                ? preloadedPersonal
                : undefined,
    });

    const personalSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchObjectivesByUser,
            hasSearch
                ? {
                      search: searchText,
                      limit: 50,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const orgPagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts: orgPaginationOpts, reset: resetOrgPagination } = orgPagination;
    const orgIsFirstPage = orgPaginationOpts.cursor === null;

    const orgQuery = useQuery({
        ...convexQuery(
            api.objectives.getOrganizationObjectives,
            hasSearch
                ? 'skip'
                : {
                      paginationOpts: orgPaginationOpts,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
        ),
        initialData:
            !hasSearch &&
            orgIsFirstPage &&
            filters.status === 'all' &&
            filters.category === 'all' &&
            filters.deadlineRange === 'all'
                ? preloadedOrg
                : undefined,
    });

    const orgSearchQuery = useQuery(
        convexQuery(
            api.objectives.searchOrganizationObjectives,
            hasSearch
                ? {
                      search: searchText,
                      limit: 50,
                      status: statusFilter,
                      category: categoryFilter,
                      deadlineRange: deadlineRangeFilter,
                  }
                : 'skip'
        )
    );

    const categoryOptionsQuery = useQuery(
        convexQuery(api.categories.getCategoryNamesForFilters, {})
    );

    const personalContinueCursor = personalQuery.data?.continueCursor ?? null;
    const personalPageIsDone = personalQuery.data?.isDone ?? false;
    const personalHasNextPage = Boolean(personalContinueCursor) && !personalPageIsDone;
    const orgContinueCursor = orgQuery.data?.continueCursor ?? null;
    const orgPageIsDone = orgQuery.data?.isDone ?? false;
    const orgHasNextPage = Boolean(orgContinueCursor) && !orgPageIsDone;

    const personalObjectives = React.useMemo(
        () => (hasSearch ? (personalSearchQuery.data ?? []) : (personalQuery.data?.page ?? [])),
        [hasSearch, personalQuery.data, personalSearchQuery.data]
    );
    const organizationObjectives = React.useMemo(
        () => (hasSearch ? (orgSearchQuery.data ?? []) : (orgQuery.data?.page ?? [])),
        [hasSearch, orgQuery.data, orgSearchQuery.data]
    );

    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.objectives.getObjectivesByUser, DEFAULT_PAGINATION_OPTS)
            );
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.objectives.getOrganizationObjectives, DEFAULT_PAGINATION_OPTS)
            );
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.objectives.searchObjectivesByUser, {
                    search: '',
                    limit: 50,
                })
            );
            invalidateConvexQuery(
                queryClient,
                convexQuery(api.objectives.searchOrganizationObjectives, {
                    search: '',
                    limit: 50,
                })
            );
        },
    });

    const categories = categoryOptionsQuery.data ?? [];

    const handleFiltersChange = React.useCallback(
        (nextFilters: FilterOptions) => {
            const shouldResetPagination =
                nextFilters.status !== filters.status ||
                nextFilters.category !== filters.category ||
                nextFilters.deadlineRange !== filters.deadlineRange ||
                nextFilters.search !== filters.search;

            if (shouldResetPagination) {
                resetPersonalPagination();
                resetOrgPagination();
            }

            setFilters(nextFilters);
        },
        [
            filters.status,
            filters.category,
            filters.deadlineRange,
            filters.search,
            resetOrgPagination,
            resetPersonalPagination,
        ]
    );

    const statusLabels = React.useMemo(
        () => ({
            active: t('statusOptions.active'),
            completed: t('statusOptions.completed'),
            overdue: t('statusLabels.overdue'),
        }),
        [t]
    );

    const renderObjectiveActions = React.useCallback(
        (objective: Doc<'objectives'>) => (
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
                        <Button
                            data-testid="objective-delete-button"
                            variant="destructive"
                            size="sm"
                        >
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
        ),
        [deleteObjectiveMutation, t]
    );

    const objectiveColumns = React.useMemo<ColumnDef<Doc<'objectives'>>[]>(
        () => [
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
                    row.original.deadline
                        ? new Date(row.original.deadline).toLocaleDateString()
                        : '-',
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
                                {objective.currentValue}/{objective.targetValue}{' '}
                                {objective.unit ?? ''}
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
        ],
        [renderObjectiveActions, statusLabels, t]
    );

    const renderObjectiveCard = React.useCallback(
        (objective: Doc<'objectives'>) => {
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
                                {objective.currentValue}/{objective.targetValue}{' '}
                                {objective.unit ?? ''}
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
        },
        [statusLabels, renderObjectiveActions]
    );

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
                    <Badge variant="secondary">{personalObjectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {personalObjectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {personalObjectives.map(renderObjectiveCard)}
                        </div>
                    )}
                    {!hasSearch && (
                        <MobilePagination
                            pagination={personalPagination}
                            rowCount={personalObjectives.length}
                            hasNextPage={personalHasNextPage}
                            isLoading={personalQuery.isFetching}
                            onNextPage={() =>
                                personalPagination.nextPage(
                                    personalContinueCursor,
                                    personalPageIsDone
                                )
                            }
                        />
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable
                        columns={objectiveColumns}
                        data={personalObjectives}
                        isLoading={
                            hasSearch ? personalSearchQuery.isLoading : personalQuery.isLoading
                        }
                        pagination={
                            hasSearch
                                ? undefined
                                : {
                                      currentPage: personalPagination.currentPage,
                                      onNextPage: () =>
                                          personalPagination.nextPage(
                                              personalContinueCursor,
                                              personalPageIsDone
                                          ),
                                      onPreviousPage: personalPagination.previousPage,
                                      hasNextPage: personalHasNextPage,
                                      hasPreviousPage: personalPagination.hasPreviousPage,
                                      isLoading: personalQuery.isFetching,
                                  }
                        }
                    />
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('sections.organization')}</h2>
                    <Badge variant="secondary">{organizationObjectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {organizationObjectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {organizationObjectives.map(renderObjectiveCard)}
                        </div>
                    )}
                    {!hasSearch && (
                        <MobilePagination
                            pagination={orgPagination}
                            rowCount={organizationObjectives.length}
                            hasNextPage={orgHasNextPage}
                            isLoading={orgQuery.isFetching}
                            onNextPage={() =>
                                orgPagination.nextPage(orgContinueCursor, orgPageIsDone)
                            }
                        />
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable
                        columns={objectiveColumns}
                        data={organizationObjectives}
                        isLoading={hasSearch ? orgSearchQuery.isLoading : orgQuery.isLoading}
                        pagination={
                            hasSearch
                                ? undefined
                                : {
                                      currentPage: orgPagination.currentPage,
                                      onNextPage: () =>
                                          orgPagination.nextPage(orgContinueCursor, orgPageIsDone),
                                      onPreviousPage: orgPagination.previousPage,
                                      hasNextPage: orgHasNextPage,
                                      hasPreviousPage: orgPagination.hasPreviousPage,
                                      isLoading: orgQuery.isFetching,
                                  }
                        }
                    />
                </div>
            </section>
        </div>
    );
});

ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';
