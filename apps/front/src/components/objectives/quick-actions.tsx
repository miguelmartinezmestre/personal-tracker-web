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
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { toast } from 'sonner';

interface QuickActionsProps {
    objectiveId: Id<'objectives'>;
    currentStatus: string;
    className?: string;
}

const QuickActions = React.forwardRef<HTMLDivElement, QuickActionsProps>(
    ({ objectiveId, currentStatus, className }, ref) => {
        const completeObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.completeObjective),
            onSuccess: () => {
                toast.success('Objective completed! 🎉');
            },
            onError: (error: any) => {
                toast.error('Failed to complete objective');
                console.error(error);
            },
        });

        const pauseObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.pauseObjective),
            onSuccess: () => {
                toast.success('Objective paused');
            },
            onError: (error: any) => {
                toast.error('Failed to pause objective');
                console.error(error);
            },
        });

        const archiveObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.archiveObjective),
            onSuccess: () => {
                toast.success('Objective archived');
            },
            onError: (error: any) => {
                toast.error('Failed to archive objective');
                console.error(error);
            },
        });

        const resumeObjective = useMutation({
            mutationFn: useConvexMutation(api.objectives.updateObjectiveStatus),
            onSuccess: () => {
                toast.success('Objective resumed');
            },
            onError: (error: any) => {
                toast.error('Failed to resume objective');
                console.error(error);
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
            resumeObjective.mutate({ id: objectiveId, status: 'in_progress' });
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
                        title="Complete objective"
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
                        title="Pause objective"
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
                        title="Resume objective"
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
                        title="Archive objective"
                    >
                        <Archive className="h-4 w-4" />
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!isCompleted && !isArchived && (
                            <DropdownMenuItem onClick={handleComplete}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Complete
                            </DropdownMenuItem>
                        )}

                        {!isPaused && !isCompleted && !isArchived && (
                            <DropdownMenuItem onClick={handlePause}>
                                <PauseCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                Pause
                            </DropdownMenuItem>
                        )}

                        {isPaused && !isArchived && (
                            <DropdownMenuItem onClick={handleResume}>
                                <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                                Resume
                            </DropdownMenuItem>
                        )}

                        {!isArchived && (
                            <DropdownMenuItem onClick={handleArchive}>
                                <Archive className="mr-2 h-4 w-4 text-gray-600" />
                                Archive
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
