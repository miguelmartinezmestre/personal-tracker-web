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
import EditObjectiveFormModal from './objective-form-edit-modal';

interface ResponsiveObjectivesViewProps {
    objectives?: Objective[];
    isLoading?: boolean;
}

const ResponsiveObjectivesView = React.forwardRef<HTMLDivElement, ResponsiveObjectivesViewProps>(
    ({ objectives: propObjectives, isLoading: propIsLoading }, ref) => {
        const isMobile = useIsMobile();
        const [editingObjective, setEditingObjective] = React.useState<Objective | null>(null);

        const { data: fetchedObjectives, isLoading: fetchedIsLoading } = useQuery(
            convexQuery(api.objectives.getObjectivesByUser, {})
        );

        const objectives = propObjectives ?? fetchedObjectives ?? [];
        const isLoading = propIsLoading ?? fetchedIsLoading;

        const deleteObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.deleteObjective),
            onSuccess: () => {
                toast.success('Objective deleted successfully');
            },
            onError: (error: any) => {
                toast.error('Failed to delete objective');
                console.error(error);
            },
        });

        const handleEdit = (objective: Objective) => {
            setEditingObjective(objective);
        };

        const handleDelete = (id: Id<'objectives'>) => {
            if (confirm('Are you sure you want to delete this objective?')) {
                deleteObjective.mutate({ id });
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
                            <p className="text-muted-foreground">No objectives found</p>
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
            <div ref={ref}>
                <ObjetivesTable objectives={objectives} isLoading={isLoading} />
            </div>
        );
    }
);
ResponsiveObjectivesView.displayName = 'ResponsiveObjectivesView';

export { ResponsiveObjectivesView };
