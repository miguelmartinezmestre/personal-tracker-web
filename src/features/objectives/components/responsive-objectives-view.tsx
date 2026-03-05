'use client';

import * as React from 'react';
import Link from 'next/link';
import { Preloaded } from 'convex/react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useConvexMutation } from '@convex-dev/react-query';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
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

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type ObjectivesResponse = {
    page: Doc<'objectives'>[];
};

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

    const personalObjectivesResult = usePreloadedAuthQuery(preloadedPersonalObjectivesQuery) as
        | ObjectivesResponse
        | undefined;
    const organizationObjectivesResult = usePreloadedAuthQuery(
        preloadedOrganizationObjectivesQuery
    ) as ObjectivesResponse | undefined;
    const personalObjectives = React.useMemo(
        () => personalObjectivesResult?.page ?? [],
        [personalObjectivesResult]
    );
    const organizationObjectives = React.useMemo(
        () => organizationObjectivesResult?.page ?? [],
        [organizationObjectivesResult]
    );

    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.objectives.getObjectivesByUser] });
            queryClient.invalidateQueries({ queryKey: [api.objectives.getOrganizationObjectives] });
        },
    });

    const categories = React.useMemo(() => {
        const values = [...personalObjectives, ...organizationObjectives]
            .map(objective => objective.category)
            .filter((category): category is string => Boolean(category));
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }, [organizationObjectives, personalObjectives]);

    const filterObjectives = React.useCallback(
        (objectives: Doc<'objectives'>[]) => {
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

            return objectives.filter(objective => {
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
        },
        [filters]
    );

    const filteredPersonalObjectives = React.useMemo(
        () => filterObjectives(personalObjectives),
        [filterObjectives, personalObjectives]
    );

    const filteredOrganizationObjectives = React.useMemo(
        () => filterObjectives(organizationObjectives),
        [filterObjectives, organizationObjectives]
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
                onFiltersChange={setFilters}
                categories={categories}
                className="w-full"
            />

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('sections.personal')}</h2>
                    <Badge variant="secondary">{filteredPersonalObjectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {filteredPersonalObjectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredPersonalObjectives.map(renderObjectiveCard)}
                        </div>
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable columns={objectiveColumns} data={filteredPersonalObjectives} />
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{t('sections.organization')}</h2>
                    <Badge variant="secondary">{filteredOrganizationObjectives.length}</Badge>
                </div>
                <div className="md:hidden">
                    {filteredOrganizationObjectives.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('empty.noObjectivesFound')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredOrganizationObjectives.map(renderObjectiveCard)}
                        </div>
                    )}
                </div>
                <div className="hidden md:block">
                    <DataTable columns={objectiveColumns} data={filteredOrganizationObjectives} />
                </div>
            </section>
        </div>
    );
});

ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';
