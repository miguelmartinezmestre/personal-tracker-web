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

interface ResponsiveObjectivesViewProps {
    objectives?: Objective[];
    isLoading?: boolean;
}

const ResponsiveObjectivesView = React.forwardRef<HTMLDivElement, ResponsiveObjectivesViewProps>(
    ({ objectives: propObjectives, isLoading: propIsLoading }, ref) => {
        const isMobile = useIsMobile();
        const t = useTranslations('Objectives');
        const [editingObjective, setEditingObjective] = React.useState<Objective | null>(null);

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

        if (isMobile) {
            return (
                <div ref={ref} className="space-y-4">
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
                <ObjetivesTable objectives={objectives} isLoading={isLoading} />
            </div>
        );
    }
);
ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';

export { ResponsiveObjectivesView };
