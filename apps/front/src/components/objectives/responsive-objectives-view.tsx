'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ObjetivesTable from './objetives-table';
import { ObjectiveCard } from './objective-card';
import { Objective } from '@/schemas/objective';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import EditObjectiveFormModal from './objective-form-edit-modal';
import { useObjectives, useDeleteObjective } from '@/hooks/api/use-objectives';
import { ObjectivesFilters, type FilterOptions } from './objetive-filters';

interface ResponsiveObjectivesViewProps {
    objectives?: Objective[];
    isLoading?: boolean;
}

const DEFAULT_FILTERS: FilterOptions = {
    search: '',
    status: 'all',
    category: 'all',
    deadlineRange: 'all',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const ResponsiveObjectivesView = React.forwardRef<HTMLDivElement, ResponsiveObjectivesViewProps>(
    ({ objectives: propObjectives, isLoading: propIsLoading }, ref) => {
        const isMobile = useIsMobile();
        const t = useTranslations('Objectives');
        const [editingObjective, setEditingObjective] = React.useState<Objective | null>(null);
        const [filters, setFilters] = React.useState<FilterOptions>(DEFAULT_FILTERS);

        const { data: fetchedObjectives, isLoading: fetchedIsLoading } = useObjectives();
        const objectives = propObjectives ?? fetchedObjectives ?? [];
        const isLoading = propIsLoading ?? fetchedIsLoading;

        const deleteObjectiveMutation = useDeleteObjective();

        const handleEdit = (objective: Objective) => {
            setEditingObjective(objective);
        };

        const handleDelete = (id: Id<'objectives'>) => {
            if (confirm(t('confirm.deleteObjective'))) {
                deleteObjectiveMutation.mutate(
                    { id },
                    {
                        onSuccess: () => {
                            toast.success(t('toast.deletedSuccess'));
                        },
                        onError: (error: Error) => {
                            toast.error(t('toast.deleteFailed'));
                            console.error(error);
                        },
                    }
                );
            }
        };

        const categories = React.useMemo(() => {
            const values = objectives
                .map(objective => objective.category)
                .filter((category): category is string => Boolean(category));
            return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
        }, [objectives]);

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

            const filtered = objectives.filter(objective => {
                if (normalizedSearch) {
                    const haystack = [
                        objective.title,
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

        if (isMobile) {
            return (
                <div ref={ref} className="space-y-4">
                    <ObjectivesFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        categories={categories}
                    />
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : filteredObjectives.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{t('empty.noObjectivesFound')}</p>
                        </div>
                    ) : (
                        filteredObjectives.map(objective => (
                            <ObjectiveCard
                                key={objective._id}
                                objective={objective}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    )}

                    {editingObjective && (
                        <EditObjectiveFormModal defaultValues={editingObjective} />
                    )}
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
                <ObjetivesTable objectives={filteredObjectives} isLoading={isLoading} />
            </div>
        );
    }
);
ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';

export { ResponsiveObjectivesView };
