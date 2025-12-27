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
import {
    useCompleteObjective,
    usePauseObjective,
    useArchiveObjective,
    useUpdateObjectiveStatus,
} from '@/hooks/api/use-objectives';

interface QuickActionsProps {
    objectiveId: Id<'objectives'>;
    currentStatus: string;
    className?: string;
}

const QuickActions = React.forwardRef<HTMLDivElement, QuickActionsProps>(
    ({ objectiveId, currentStatus, className }, ref) => {
        const t = useTranslations('Objectives');

        const completeObjective = useCompleteObjective();
        const pauseObjective = usePauseObjective();
        const archiveObjective = useArchiveObjective();
        const resumeObjective = useUpdateObjectiveStatus();

        const handleComplete = () => {
            completeObjective.mutate(
                { id: objectiveId },
                {
                    onSuccess: () => {
                        toast.success(t('toast.completedSuccess'));
                    },
                    onError: (error: Error) => {
                        toast.error(t('toast.completeFailed'));
                        console.error(error);
                    },
                }
            );
        };

        const handlePause = () => {
            pauseObjective.mutate(
                { id: objectiveId },
                {
                    onSuccess: () => {
                        toast.success(t('toast.pausedSuccess'));
                    },
                    onError: (error: Error) => {
                        toast.error(t('toast.pauseFailed'));
                        console.error(error);
                    },
                }
            );
        };

        const handleArchive = () => {
            archiveObjective.mutate(
                { id: objectiveId },
                {
                    onSuccess: () => {
                        toast.success(t('toast.archivedSuccess'));
                    },
                    onError: (error: Error) => {
                        toast.error(t('toast.archiveFailed'));
                        console.error(error);
                    },
                }
            );
        };

        const handleResume = () => {
            resumeObjective.mutate(
                { id: objectiveId, status: 'in_progress' },
                {
                    onSuccess: () => {
                        toast.success(t('toast.resumedSuccess'));
                    },
                    onError: (error: Error) => {
                        toast.error(t('toast.resumeFailed'));
                        console.error(error);
                    },
                }
            );
        };

        const isCompleted = currentStatus.toLowerCase() === 'completed';
        const isPaused = currentStatus.toLowerCase() === 'paused';
        const isArchived = currentStatus.toLowerCase() === 'archived';

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
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!isCompleted && !isArchived && (
                            <DropdownMenuItem onClick={handleComplete}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                {t('menu.complete')}
                            </DropdownMenuItem>
                        )}

                        {!isPaused && !isCompleted && !isArchived && (
                            <DropdownMenuItem onClick={handlePause}>
                                <PauseCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                {t('menu.pause')}
                            </DropdownMenuItem>
                        )}

                        {isPaused && !isArchived && (
                            <DropdownMenuItem onClick={handleResume}>
                                <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                                {t('menu.resume')}
                            </DropdownMenuItem>
                        )}

                        {!isArchived && (
                            <DropdownMenuItem onClick={handleArchive}>
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
