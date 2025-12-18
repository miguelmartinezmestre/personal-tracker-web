'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ObjetivesTable from './objetives-table';
import { ObjectiveCard } from './objective-card';
import { Objective } from '@/schemas/objective';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import EditObjectiveFormModal from './objective-form-edit-modal';
import { ObjectivesFilters, type FilterOptions } from './objectives-filters';

interface ResponsiveObjectivesViewProps {
    objectives?: Objective[];
    isLoading?: boolean;
}

const ResponsiveObjectivesView = React.forwardRef<HTMLDivElement, ResponsiveObjectivesViewProps>(
    ({ objectives: propObjectives, isLoading: propIsLoading }, ref) => {
        const isMobile = useIsMobile();
        const t = useTranslations('Objectives');
        const [editingObjective, setEditingObjective] = React.useState<Objective | null>(null);

        // State for filters
        const [filters, setFilters] = React.useState<FilterOptions>({
            search: '',
            status: 'all',
            category: 'all',
            deadlineRange: 'all',
            sortBy: 'createdAt_desc',
        });

        const { data: fetchedObjectives, isLoading: fetchedIsLoading } = useQuery(
            convexQuery(api.objectives.getObjectivesByUser, {})
        );

        // Filter objectives based on the current filters
        const filteredObjectives = React.useMemo(() => {
            let filtered = propObjectives ?? fetchedObjectives ?? [];
            const getProgressRatio = (objective: Objective) =>
                objective.targetValue > 0 ? objective.currentValue / objective.targetValue : 0;

            // Apply search filter
            if (filters.search) {
                filtered = filtered.filter(objective =>
                    objective.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                    objective.description?.toLowerCase().includes(filters.search.toLowerCase())
                );
            }

            // Apply status filter
            if (filters.status !== 'all') {
                filtered = filtered.filter(objective => objective.status === filters.status);
            }

            // Apply category filter
            if (filters.category !== 'all') {
                filtered = filtered.filter(objective => objective.category === filters.category);
            }

            // Apply deadline range filter
            if (filters.deadlineRange !== 'all') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                filtered = filtered.filter(objective => {
                    if (!objective.deadline) return false;

                    const deadline = new Date(objective.deadline);

                    switch (filters.deadlineRange) {
                        case 'today':
                            return deadline.toDateString() === today.toDateString();
                        case 'week':
                            return deadline >= today && deadline <= weekEnd;
                        case 'month':
                            return deadline >= today && deadline <= monthEnd;
                        case 'overdue':
                            return deadline < today;
                        default:
                            return true;
                    }
                });
            }

            // Apply sorting
            filtered.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'createdAt_asc':
                        return new Date(a._creationTime).getTime() - new Date(b._creationTime).getTime();
                    case 'createdAt_desc':
                        return new Date(b._creationTime).getTime() - new Date(a._creationTime).getTime();
                    case 'deadline_asc':
                        if (!a.deadline) return 1;
                        if (!b.deadline) return -1;
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    case 'deadline_desc':
                        if (!a.deadline) return -1;
                        if (!b.deadline) return 1;
                        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
                    case 'title_asc':
                        return a.title.localeCompare(b.title);
                    case 'title_desc':
                        return b.title.localeCompare(a.title);
                    case 'progress_asc':
                        return getProgressRatio(a) - getProgressRatio(b);
                    case 'progress_desc':
                        return getProgressRatio(b) - getProgressRatio(a);
                    default:
                        return 0;
                }
            });

            return filtered;
        }, [propObjectives, fetchedObjectives, filters]);

        const objectives = filteredObjectives;
        const isLoading = propIsLoading ?? fetchedIsLoading;

        const deleteObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.deleteObjective),
            onSuccess: () => {
                toast.success(t('toast.deletedSuccess'));
            },
            onError: (error: Error) => {
                toast.error(t('toast.deleteFailed'));
                console.error(error);
            },
        });

        const handleEdit = (objective: Objective) => {
            setEditingObjective(objective);
        };

        const handleDelete = (id: Id<'objectives'>) => {
            if (confirm(t('confirm.deleteObjective'))) {
                deleteObjective.mutate({ id });
            }
        };

        // Get unique categories from objectives
        const categories = React.useMemo(() => {
            const allObjectives = propObjectives ?? fetchedObjectives ?? [];
            const uniqueCategories = [...new Set(allObjectives.map(obj => obj.category).filter(Boolean))];
            return uniqueCategories;
        }, [propObjectives, fetchedObjectives]);

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
                    ) : objectives.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{t('empty.noObjectivesFound')}</p>
                        </div>
                    ) : (
                        objectives.map(objective => (
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
                <ObjetivesTable objectives={objectives} isLoading={isLoading} />
            </div>
        );
    }
);
ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';

export { ResponsiveObjectivesView };
