'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { CheckCircle, PauseCircle, Archive, PlayCircle, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

interface QuickActionsProps {
    objectiveId: Id<'objectives'>;
    currentStatus: string;
    className?: string;
}

const QuickActions = React.forwardRef<HTMLDivElement, QuickActionsProps>(
    ({ objectiveId, currentStatus, className }, ref) => {
        const t = useTranslations('Objectives');
        const queryClient = useQueryClient();

        const invalidateObjectives = () => {
            // Invalidate all objectives queries regardless of pagination
            queryClient.invalidateQueries({
                queryKey: [api.objectives.getObjectivesByUser],
            });
        };

        const completeObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.completeObjective),
            onSuccess: () => {
                toast.success(t('toast.completedSuccess'));
                invalidateObjectives();
            },
        });

        const pauseObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.pauseObjective),
            onSuccess: () => {
                toast.success(t('toast.pausedSuccess'));
                invalidateObjectives();
            },
        });

        const archiveObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.archiveObjective),
            onSuccess: () => {
                toast.success(t('toast.archivedSuccess'));
                invalidateObjectives();
            },
        });

        const resumeObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.resumeObjective),
            onSuccess: () => {
                toast.success(t('toast.resumedSuccess'));
                invalidateObjectives();
            },
        });

        const handleComplete = () => {
            completeObjective.mutate({ id: objectiveId });
        };

        const handlePause = () => {
            pauseObjective.mutate({ id: objectiveId });
        };

        const handleArchive = () => {
            archiveObjective.mutate({ id: objectiveId });
        };

        const handleResume = () => {
            resumeObjective.mutate({ id: objectiveId });
        };

        const status = currentStatus.toLowerCase();
        const isCompleted = status === 'completed';
        const isPaused = status === 'paused';
        const isArchived = status === 'archived';
        const isDeleted = status === 'deleted';

        // Don't show actions for terminal states
        if (isDeleted) {
            return null;
        }

        return (
            <div ref={ref} className={`flex items-center space-x-1 ${className}`}>
                {!isCompleted && !isArchived && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleComplete}
                        disabled={completeObjective.isPending}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={t('tooltips.complete')}
                        aria-label={t('tooltips.complete')}
                        data-testid="objective-complete-button"
                    >
                        <CheckCircle className="h-4 w-4" />
                    </Button>
                )}

                {!isPaused && !isCompleted && !isArchived && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePause}
                        disabled={pauseObjective.isPending}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        title={t('tooltips.pause')}
                        aria-label={t('tooltips.pause')}
                        data-testid="objective-pause-button"
                    >
                        <PauseCircle className="h-4 w-4" />
                    </Button>
                )}

                {isPaused && !isArchived && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResume}
                        disabled={resumeObjective.isPending}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title={t('tooltips.resume')}
                        aria-label={t('tooltips.resume')}
                        data-testid="objective-resume-button"
                    >
                        <PlayCircle className="h-4 w-4" />
                    </Button>
                )}

                {!isArchived && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleArchive}
                        disabled={archiveObjective.isPending}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        title={t('tooltips.archive')}
                        aria-label={t('tooltips.archive')}
                        data-testid="objective-archive-button"
                    >
                        <Archive className="h-4 w-4" />
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={t('tooltips.more')}
                            aria-label={t('tooltips.more')}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!isCompleted && !isArchived && (
                            <DropdownMenuItem
                                onClick={handleComplete}
                                data-testid="objective-complete-menu-item"
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                {t('menu.complete')}
                            </DropdownMenuItem>
                        )}

                        {!isPaused && !isCompleted && !isArchived && (
                            <DropdownMenuItem
                                onClick={handlePause}
                                data-testid="objective-pause-menu-item"
                            >
                                <PauseCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                {t('menu.pause')}
                            </DropdownMenuItem>
                        )}

                        {isPaused && !isArchived && (
                            <DropdownMenuItem
                                onClick={handleResume}
                                data-testid="objective-resume-menu-item"
                            >
                                <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                                {t('menu.resume')}
                            </DropdownMenuItem>
                        )}

                        {!isArchived && (
                            <DropdownMenuItem
                                onClick={handleArchive}
                                data-testid="objective-archive-menu-item"
                            >
                                <Archive className="mr-2 h-4 w-4 text-gray-600" />
                                {t('menu.archive')}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }
);
QuickActions.displayName = 'QuickActions';

export { QuickActions };
