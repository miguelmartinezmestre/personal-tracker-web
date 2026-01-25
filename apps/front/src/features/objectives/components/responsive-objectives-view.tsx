'use client';

import * as React from 'react';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';
import { DataTableAdvanced } from '@/features/table/components/table';
import { ColumnDef } from '@tanstack/react-table';
import { ObjectiveCard } from '@/features/objectives/components/objective-card';
import { Objective } from '@/features/objectives/schemas/objective';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import EditObjectiveFormModal from '@/features/objectives/components/objective-form-edit-modal';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { ObjectivesFilters, type FilterOptions } from './objective-filters';
import { Button } from '@repo/ui/components/button';
import { CircularProgress } from '@repo/ui/components/circular-progress';
import { StatusIndicator } from '@repo/ui/components/status-indicator';
import Link from 'next/link';
import { QuickActions } from './quick-actions';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeObjective } from './objectives-utils';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { Preloaded } from 'convex/react';

// Hoist static constants outside component to avoid recreation on every render
const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ITEMS_PER_PAGE = 10;

// Load more items at once for objectives (no backend limit)
const LARGE_PAGE_SIZE = 1000;

// Static skeleton array for loading state
const SKELETON_PLACEHOLDERS = [1, 2, 3];

const ResponsiveObjectivesView = React.forwardRef<
    HTMLDivElement,
    { preloadedObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser> }
>(({ preloadedObjectivesQuery }, ref) => {
    const isMobile = useIsMobile();
    const t = useTranslations('Objectives');
    const tCard = useTranslations('ObjectiveCard');
    const [editingObjective, setEditingObjective] = React.useState<Objective | null>(null);
    const [filters, setFilters] = React.useState<FilterOptions>(DEFAULT_FILTERS);
    const [currentPage, setCurrentPage] = React.useState(0);

    // Fetch ALL objectives for client-side filtering
    const fetchedObjectives = usePreloadedAuthQuery(preloadedObjectivesQuery);

    const queryClient = useQueryClient();
    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            // Invalidate all objectives queries regardless of pagination
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
            toast.success(t('toast.deletedSuccess'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    const objectives = fetchedObjectives ?? [];

    const handleEdit = (objective: Objective) => {
        setEditingObjective(objective);
    };

    const handleDelete = (id: Id<'objectives'>) => {
        if (confirm(t('confirm.deleteObjective'))) {
            deleteObjectiveMutation.mutate({ id });
        }
    };

    const categories = React.useMemo(() => {
        const values = fetchedObjectives?.page
            .map(objective => objective.category)
            .filter((category): category is string => Boolean(category));
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }, [fetchedObjectives]);

    const filteredObjectives = React.useMemo(() => {
        const normalizedSearch = filters.search.trim().toLowerCase();
        const now = Date.now();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const todayStart = startOfToday.getTime();
        const tomorrowStart = todayStart + DAY_MS;
        const startOfNextMonth = new Date(
            startOfToday.getFullYear(),
            startOfToday.getMonth() + 1,
            1
        ).getTime();

        const matchesDeadlineRange = (deadline?: number | null) => {
            if (!deadline) return false;
            switch (filters.deadlineRange) {
                case 'today':
                    return deadline >= todayStart && deadline < tomorrowStart;
                case 'week':
                    return deadline >= todayStart && deadline < todayStart + 7 * DAY_MS;
                case 'month':
                    return deadline >= todayStart && deadline < startOfNextMonth;
                case 'overdue':
                    return deadline < todayStart;
                default:
                    return true;
            }
        };

        const filtered = fetchedObjectives?.page.filter(objective => {
            if (normalizedSearch) {
                const haystack = [
                    objective.title ?? '',
                    objective.description ?? '',
                    objective.category ?? '',
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(normalizedSearch)) {
                    return false;
                }
            }

            if (filters.status !== 'all' && objective.status !== filters.status) {
                return false;
            }

            if (filters.category !== 'all' && objective.category !== filters.category) {
                return false;
            }

            if (filters.deadlineRange !== 'all' && !matchesDeadlineRange(objective.deadline)) {
                return false;
            }

            return true;
        });

        return filtered;
    }, [objectives, filters]);

    // Client-side pagination
    const totalPages = Math.ceil((filteredObjectives?.length ?? 0) / ITEMS_PER_PAGE) || 1;

    const paginatedObjectives = filteredObjectives?.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const getPeriodLabel = (period?: string | null) => {
        switch (period) {
            case 'weekly':
                return tCard('perWeek');
            case 'monthly':
                return tCard('perMonth');
            case 'custom':
                return tCard('perPeriod');
            default:
                return '';
        }
    };

    const actionMeta = {
        isAction: true,
        excludeFromExport: true,
        disableColumnOrder: true,
        disableColumnVisibility: true,
    };

    const columns: ColumnDef<Objective>[] = [
        {
            accessorKey: 'title',
            header: t('title'),
        },
        {
            id: 'description',
            accessorFn: objective => objective.description ?? '',
            header: t('tableDescription'),
        },
        {
            id: 'progress',
            accessorFn: objective =>
                objective.targetValue > 0 ? objective.currentValue / objective.targetValue : 0,
            header: t('progress'),
            cell: ({ row }) => {
                const objective = row.original;
                const periodLabel = getPeriodLabel(objective.period);
                const maxValue = objective.targetValue > 0 ? objective.targetValue : 100;
                return (
                    <div className="flex items-center space-x-2">
                        <CircularProgress value={objective.currentValue} max={maxValue} size="sm" />
                        <span className="text-sm text-muted-foreground">
                            {objective.currentValue}/{objective.targetValue} {objective.unit || ''}
                            {periodLabel ? ` (${periodLabel})` : ''}
                        </span>
                    </div>
                );
            },
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
            cell: ({ row }) => {
                const objective = row.original;
                return (
                    <StatusIndicator
                        status={objective.status ?? 'active'}
                        deadline={objective.deadline ?? undefined}
                        currentValue={objective.currentValue ?? 0}
                        targetValue={objective.targetValue ?? 0}
                    />
                );
            },
        },
        {
            header: t('quickActions'),
            id: 'quick-actions',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <QuickActions
                        objectiveId={objetiveRow._id as Id<'objectives'>}
                        currentStatus={objetiveRow.status ?? 'active'}
                    />
                );
            },
        },
        {
            header: '',
            id: 'update-objective',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return <EditObjectiveFormModal defaultValues={objetiveRow} />;
            },
        },
        {
            header: '',
            id: 'delete',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            await deleteObjectiveMutation.mutateAsync({
                                id: objetiveRow._id as Id<'objectives'>,
                            });
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
                );
            },
        },
        {
            header: '',
            id: 'go-to-activity',
            meta: actionMeta,
            enableSorting: false,
            cell: ({ row }) => {
                const objetiveRow = row.original;
                if (objetiveRow._id) {
                    return (
                        <Link
                            href={`/dashboard/objectives/${String(objetiveRow._id)}`}
                            prefetch={false}
                            data-testid="objective-progress-link"
                        >
                            {t('goToProgress')}
                        </Link>
                    );
                }

                return null;
            },
        },
    ];

    if (isMobile) {
        return (
            <div ref={ref} className="space-y-4">
                <ObjectivesFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={categories}
                />
                {!fetchedObjectives ? (
                    <div className="space-y-4">
                        {SKELETON_PLACEHOLDERS.map(i => (
                            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredObjectives?.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">{t('empty.noObjectivesFound')}</p>
                    </div>
                ) : (
                    paginatedObjectives?.map(objective => (
                        <ObjectiveCard
                            key={objective._id}
                            objective={normalizeObjective(objective)}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))
                )}

                {editingObjective && <EditObjectiveFormModal defaultValues={editingObjective} />}
            </div>
        );
    }

    return (
        <div ref={ref} className="space-y-4">
            <ObjectivesFilters
                filters={filters}
                onFiltersChange={setFilters}
                categories={categories}
            />
            <DataTableAdvanced
                columns={columns}
                data={paginatedObjectives?.map(normalizeObjective) ?? []}
                isLoading={!fetchedObjectives}
                enableGlobalSearch={false}
                enableColumnFilters={false}
                enableSorting={true}
                pagination={
                    totalPages > 1
                        ? {
                              currentPage,
                              totalPages,
                              onPageChange: setCurrentPage,
                              hasNextPage: currentPage < totalPages - 1,
                              hasPreviousPage: currentPage > 0,
                              pageSize: ITEMS_PER_PAGE,
                              totalItems: filteredObjectives?.length ?? 0,
                          }
                        : undefined
                }
            />
        </div>
    );
});

ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';

export { ResponsiveObjectivesView };
