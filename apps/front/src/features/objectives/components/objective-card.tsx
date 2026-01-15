'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { CircularProgress } from '@repo/ui/components/circular-progress';
import { StatusIndicator } from '@repo/ui/components/status-indicator';
import { QuickActions } from '@/features/objectives/components/quick-actions';
import { Calendar, Target, TrendingUp, ChevronRight, AlertCircle } from 'lucide-react';
import { Objective } from '@/features/objectives/schemas/objective';
import { Id } from '@repo/backend/convex/_generated/dataModel';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@repo/ui/lib/utils';

interface ObjectiveCardProps {
    objective: Objective;
    onEdit?: (objective: Objective) => void;
    onDelete?: (id: Id<'objectives'>) => void;
}

const ObjectiveCard = React.forwardRef<HTMLDivElement, ObjectiveCardProps>(
    ({ objective, onEdit, onDelete }, ref) => {
        const t = useTranslations('ObjectiveCard');
        const targetValue = objective.targetValue ?? 0;
        const currentValue = objective.currentValue ?? 0;
        const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
        const isOverdue = objective.deadline && objective.deadline < Date.now();

        const getPeriodLabel = (period?: string | null) => {
            switch (period) {
                case 'weekly':
                    return t('perWeek');
                case 'monthly':
                    return t('perMonth');
                case 'custom':
                    return t('perPeriod');
                default:
                    return '';
            }
        };
        const periodLabel = getPeriodLabel(objective.period);

        const getProgressColor = (progress: number) => {
            if (progress >= 75) return 'text-green-500';
            if (progress >= 50) return 'text-yellow-500';
            return 'text-orange-500';
        };

        const getProgressBg = (progress: number) => {
            if (progress >= 75) return 'from-green-500/10 to-green-500/5';
            if (progress >= 50) return 'from-yellow-500/10 to-yellow-500/5';
            return 'from-orange-500/10 to-orange-500/5';
        };

        return (
            <Card
                ref={ref}
                data-tour="objective-card"
                className={cn(
                    'group mb-4 hover:shadow-lg transition-all duration-300 border-border/50',
                    isOverdue && 'border-destructive/50 hover:border-destructive/70'
                )}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                                    {objective.title}
                                </h3>
                                {isOverdue && (
                                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                )}
                            </div>
                            {objective.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {objective.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <QuickActions
                                objectiveId={objective._id as Id<'objectives'>}
                                currentStatus={objective.status ?? 'not_started'}
                                className="flex-row"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Progress Section */}
                    <div
                        className={cn(
                            'flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br transition-all duration-300',
                            getProgressBg(progress)
                        )}
                    >
                        <div className="relative">
                            <CircularProgress
                                value={objective.currentValue ?? 0}
                                max={objective.targetValue ?? 0}
                                size="md"
                            />
                            <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span
                                    className={cn(
                                        'text-sm font-medium transition-colors',
                                        getProgressColor(progress)
                                    )}
                                >
                                    {Math.round(progress)}
                                    {t('percentComplete')}
                                </span>
                                <StatusIndicator
                                    status={objective.status ?? 'not_started'}
                                    deadline={objective.deadline ?? undefined}
                                    currentValue={objective.currentValue ?? 0}
                                    targetValue={objective.targetValue ?? 0}
                                />
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {objective.currentValue ?? 0} / {objective.targetValue ?? 0}{' '}
                                {objective.unit || ''} {periodLabel ? `(${periodLabel})` : ''}
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Category */}
                        {objective.category && (
                            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{objective.category}</span>
                            </div>
                        )}

                        {/* Deadline */}
                        {objective.deadline && (
                            <div
                                className={cn(
                                    'flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors',
                                    isOverdue ? 'text-destructive' : 'text-muted-foreground'
                                )}
                            >
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                    {new Date(objective.deadline).toLocaleDateString()}
                                </span>
                            </div>
                        )}

                        {/* Progress Trend */}
                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <TrendingUp
                                className={cn('h-4 w-4 flex-shrink-0', getProgressColor(progress))}
                            />
                            <span className={cn('font-medium', getProgressColor(progress))}>
                                {progress >= 75
                                    ? t('onTrack')
                                    : progress >= 50
                                        ? t('goodProgress')
                                        : t('needsAttention')}
                            </span>
                        </div>

                        {/* View Progress Link */}
                        <div className="flex items-center justify-end p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <Link
                                href={`/dashboard/objectives/${String(objective._id)}`}
                                className="flex items-center text-primary hover:text-primary/80 text-sm font-medium group/link"
                            >
                                {t('viewProgress')}
                                <ChevronRight className="h-3 w-3 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(objective)}
                            className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
                            data-tour="objective-edit-btn"
                        >
                            {t('edit')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete?.(objective._id as Id<'objectives'>)}
                            className="flex-1 hover:opacity-90 transition-opacity"
                            data-tour="objective-delete-btn"
                        >
                            {t('delete')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
);
ObjectiveCard.displayName = 'ObjectiveCard';

export { ObjectiveCard };
