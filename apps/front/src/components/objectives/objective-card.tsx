'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { CircularProgress } from '@repo/ui/components/circular-progress';
import { StatusIndicator } from '@repo/ui/components/status-indicator';
import { QuickActions } from './quick-actions';
import { Calendar, Target, TrendingUp, ChevronRight } from 'lucide-react';
import { Objective } from '@/schemas/objective';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import Link from 'next/link';

interface ObjectiveCardProps {
    objective: Objective;
    onEdit?: (objective: Objective) => void;
    onDelete?: (id: Id<'objectives'>) => void;
}

const ObjectiveCard = React.forwardRef<HTMLDivElement, ObjectiveCardProps>(
    ({ objective, onEdit, onDelete }, ref) => {
        const progress =
            objective.targetValue > 0 ? (objective.currentValue / objective.targetValue) * 100 : 0;
        const isOverdue = objective.deadline && objective.deadline < Date.now();

        return (
            <Card ref={ref} className="mb-4 hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg leading-tight truncate pr-2">
                                {objective.title}
                            </h3>
                            {objective.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {objective.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                            <QuickActions
                                objectiveId={objective._id as Id<'objectives'>}
                                currentStatus={objective.status}
                                className="flex-row"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Progress Section */}
                    <div className="flex items-center space-x-3">
                        <CircularProgress
                            value={objective.currentValue}
                            max={objective.targetValue}
                            size="md"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    {Math.round(progress)}% Complete
                                </span>
                                <StatusIndicator
                                    status={objective.status}
                                    deadline={objective.deadline}
                                    currentValue={objective.currentValue}
                                    targetValue={objective.targetValue}
                                />
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {objective.currentValue} / {objective.targetValue}{' '}
                                {objective.unit || ''}
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Category */}
                        {objective.category && (
                            <div className="flex items-center space-x-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{objective.category}</span>
                            </div>
                        )}

                        {/* Deadline */}
                        {objective.deadline && (
                            <div
                                className={`flex items-center space-x-2 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                            >
                                <Calendar className="h-4 w-4" />
                                <span className="truncate">
                                    {new Date(objective.deadline).toLocaleDateString()}
                                </span>
                            </div>
                        )}

                        {/* Progress Trend */}
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                {progress >= 75
                                    ? 'On Track'
                                    : progress >= 50
                                      ? 'Good Progress'
                                      : 'Needs Attention'}
                            </span>
                        </div>

                        {/* View Progress Link */}
                        <div className="flex items-center justify-end">
                            <Link
                                href={`/dashboard/objectives/${String(objective._id)}`}
                                className="flex items-center text-primary hover:text-primary/80 text-sm font-medium"
                            >
                                View Progress
                                <ChevronRight className="h-3 w-3 ml-1" />
                            </Link>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(objective)}
                            className="flex-1"
                        >
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete?.(objective._id as Id<'objectives'>)}
                            className="flex-1"
                        >
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
);
ObjectiveCard.displayName = 'ObjectiveCard';

export { ObjectiveCard };
