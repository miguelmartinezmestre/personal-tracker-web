'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { ObjectiveCollaboratorsDialog } from '@/features/objectives/components/objective-collaborators-dialog';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';

type ObjectiveRowActionsProps = {
    objective: ObjectiveWithCapabilities;
    onEdit: (objectiveId: ObjectiveWithCapabilities['_id']) => void;
};

export function ObjectiveRowActions({ objective, onEdit }: ObjectiveRowActionsProps) {
    const t = useTranslations('Objectives');
    const deleteObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
    });

    return (
        <div className="flex flex-wrap gap-2">
            {objective.capabilities.canManageCollaborators ? (
                <ObjectiveCollaboratorsDialog objective={objective} />
            ) : null}
            {objective.capabilities.canEditDefinition ? (
                <>
                    <Button
                        className="gap-2"
                        size="sm"
                        data-testid="objective-edit-open"
                        onClick={() => onEdit(objective._id)}
                    >
                        <Pencil className="h-4 w-4" />
                        {t('editObjective')}
                    </Button>
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
                </>
            ) : null}
            <Button asChild variant="outline" size="sm">
                <Link
                    href={`/dashboard/objectives/${objective._id}`}
                    prefetch={false}
                    data-testid="objective-progress-link"
                >
                    {t('goToProgress')}
                </Link>
            </Button>
        </div>
    );
}
