'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import type { Doc } from '@/convex/_generated/dataModel';

export function DeletedObjectivesSection() {
    const t = useTranslations('Objectives');
    const tTrash = useTranslations('Objectives.trash');
    const [expanded, setExpanded] = useState(false);

    const { data: deletedObjectives } = useQuery(
        convexQuery(api.objectives.getDeletedObjectives, {
            paginationOpts: { numItems: 100, cursor: null },
        })
    );

    const queryClient = useQueryClient();
    const hardDelete = useConvexMutation(api.objectives.hardDeleteObjective);
    const hardDeleteMutation = useMutation({
        mutationFn: hardDelete,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getDeletedObjectives],
            });
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
            toast.success(tTrash('toast.hardDeleteSuccess'));
        },
        onError: () => {
            toast.error(tTrash('toast.hardDeleteFailed'));
        },
    });

    const objectives = deletedObjectives?.page ?? [];

    if (objectives.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="trash-section-toggle"
            >
                {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                ) : (
                    <ChevronRight className="h-4 w-4" />
                )}
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">{tTrash('title')}</span>
                <Badge variant="secondary" className="text-xs">
                    {objectives.length}
                </Badge>
            </button>

            {expanded && (
                <div className="space-y-3 pl-6">
                    <p className="text-xs text-muted-foreground">{tTrash('description')}</p>
                    <div className="space-y-2">
                        {objectives.map((objective: Doc<'objectives'>) => (
                            <div
                                key={objective._id}
                                className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-muted-foreground line-through truncate">
                                        {objective.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        {objective.currentValue ?? 0} / {objective.targetValue ?? 0}{' '}
                                        {objective.unit || ''}
                                    </p>
                                </div>
                                <DeleteConfirmationDialog
                                    onConfirm={async () => {
                                        await hardDeleteMutation.mutateAsync({
                                            id: objective._id,
                                        });
                                    }}
                                    title={tTrash('confirmHardDelete')}
                                    description={tTrash('confirmHardDeleteDescription')}
                                    triggerLabel={tTrash('permanentlyDelete')}
                                    confirmLabel={tTrash('permanentlyDelete')}
                                    cancelLabel={t('confirm.cancel')}
                                    isLoading={hardDeleteMutation.isPending}
                                    trigger={
                                        <Button
                                            data-testid="hard-delete-button"
                                            variant="destructive"
                                            size="sm"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                            {tTrash('permanentlyDelete')}
                                        </Button>
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
