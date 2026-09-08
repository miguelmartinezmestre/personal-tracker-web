'use client';

import { QueryContent } from '@/components/query-content';
import { queryState } from '@/lib/query-state';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/format-date';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { MobilePagination } from './mobile-pagination';
import type { ObjectiveWithCapabilities } from '@/features/objectives/types/objective-with-capabilities';
import type { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';

type ObjectivesTrashSectionProps = {
    deletedObjectives: ObjectiveWithCapabilities[];
    isTrashLoading: boolean;
    isTrashError: boolean;
    retryTrash: () => void;
    trashPagination: ReturnType<typeof useServerPagination>;
    trashHasNextPage: boolean;
    isTrashFetching: boolean;
    onNextTrashPage: () => void;
};

export function ObjectivesTrashSection({
    deletedObjectives,
    isTrashLoading,
    isTrashError,
    retryTrash,
    trashPagination,
    trashHasNextPage,
    isTrashFetching,
    onNextTrashPage,
}: ObjectivesTrashSectionProps) {
    const t = useTranslations('Objectives');
    const locale = useLocale();
    const restoreObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.restoreObjective),
    });
    const purgeObjectiveMutation = useMutation({
        mutationFn: useConvexMutation(api.objectives.purgeObjective),
    });
    const state = queryState(
        { data: deletedObjectives, isLoading: isTrashLoading, isError: isTrashError },
        rows => rows.length === 0
    );

    return (
        <section className="space-y-3" aria-labelledby="objective-trash-heading">
            <div className="flex items-center justify-between">
                <h2 id="objective-trash-heading" className="text-xl font-semibold">
                    {t('trash.title')}
                </h2>
                {state.status === 'ready' ? (
                    <Badge variant="secondary">{deletedObjectives.length}</Badge>
                ) : null}
            </div>
            <QueryContent state={state} onRetry={retryTrash} empty={t('trash.empty')}>
                <div className="grid gap-3">
                    {deletedObjectives.map(objective => (
                        <Card key={objective._id}>
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{objective.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {objective.deletedAt
                                            ? formatDate(objective.deletedAt, locale)
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {objective.capabilities.canRestore ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={restoreObjectiveMutation.isPending}
                                            onClick={() =>
                                                restoreObjectiveMutation.mutate({
                                                    id: objective._id,
                                                })
                                            }
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            {t('trash.restore')}
                                        </Button>
                                    ) : null}
                                    {objective.capabilities.canPurge ? (
                                        <DeleteConfirmationDialog
                                            onConfirm={async () => {
                                                await purgeObjectiveMutation.mutateAsync({
                                                    id: objective._id,
                                                });
                                            }}
                                            title={t('trash.purgeTitle')}
                                            description={t('trash.purgeDescription')}
                                            triggerLabel={t('trash.purge')}
                                            confirmLabel={t('trash.purge')}
                                            cancelLabel={t('confirm.cancel')}
                                            isLoading={purgeObjectiveMutation.isPending}
                                        />
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </QueryContent>
            <MobilePagination
                pagination={trashPagination}
                rowCount={deletedObjectives.length}
                hasNextPage={trashHasNextPage}
                isLoading={isTrashFetching}
                onNextPage={onNextTrashPage}
            />
        </section>
    );
}
