'use client';

import * as React from 'react';
import { cn } from '@/lib/ui-utils/utils';
import { Badge } from '@/components/ui/badge';
import { computeObjectiveProgressPercent } from '@/features/objectives/components/objectives-utils';

interface StatusLabels {
    completed?: string;
    overdue?: string;
    onTrack?: string;
    inProgress?: string;
    atRisk?: string;
    paused?: string;
    archived?: string;
    deleted?: string;
}

const DEFAULT_LABELS: Required<StatusLabels> = {
    completed: 'Completed',
    overdue: 'Overdue',
    onTrack: 'On Track',
    inProgress: 'In Progress',
    atRisk: 'At Risk',
    paused: 'Paused',
    archived: 'Archived',
    deleted: 'Deleted',
};

interface StatusIndicatorProps {
    status: string;
    deadline?: number;
    currentValue?: number;
    targetValue?: number;
    startValue?: number;
    direction?: string;
    className?: string;
    labels?: StatusLabels;
}

const getStatusInfo = (
    status: string,
    labels: Required<StatusLabels>,
    deadline?: number,
    currentValue?: number,
    targetValue?: number,
    startValue?: number,
    direction?: string
) => {
    const now = Date.now();
    const isOverdue = deadline && deadline < now;
    const progress = computeObjectiveProgressPercent({
        currentValue: currentValue ?? 0,
        targetValue: targetValue ?? 0,
        startValue: startValue ?? null,
        direction: direction ?? 'increase',
    });

    switch (status.toLowerCase()) {
        case 'completed':
            return {
                label: labels.completed,
                variant: 'default' as const,
                className: 'bg-green-500 hover:bg-green-600 text-white',
            };
        case 'active':
            if (isOverdue) {
                return {
                    label: labels.overdue,
                    variant: 'destructive' as const,
                    className: 'bg-red-500 hover:bg-red-600 text-white',
                };
            }
            if (progress >= 75) {
                return {
                    label: labels.onTrack,
                    variant: 'default' as const,
                    className: 'bg-green-500 hover:bg-green-600 text-white',
                };
            }
            if (progress >= 50) {
                return {
                    label: labels.inProgress,
                    variant: 'secondary' as const,
                    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                };
            }
            return {
                label: labels.atRisk,
                variant: 'destructive' as const,
                className: 'bg-orange-500 hover:bg-orange-600 text-white',
            };
        case 'paused':
            return {
                label: labels.paused,
                variant: 'outline' as const,
                className: 'bg-gray-500 hover:bg-gray-600 text-white',
            };
        case 'archived':
            return {
                label: labels.archived,
                variant: 'outline' as const,
                className: 'bg-gray-400 hover:bg-gray-500 text-white',
            };
        case 'deleted':
            return {
                label: labels.deleted,
                variant: 'outline' as const,
                className: 'bg-gray-300 hover:bg-gray-400 text-white',
            };
        default:
            return {
                label: status,
                variant: 'secondary' as const,
                className: 'bg-gray-500 hover:bg-gray-600 text-white',
            };
    }
};

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
    ({ status, deadline, currentValue, targetValue, startValue, direction, className, labels, ...props }, ref) => {
        const mergedLabels: Required<StatusLabels> = { ...DEFAULT_LABELS, ...labels };
        const statusInfo = getStatusInfo(
            status,
            mergedLabels,
            deadline,
            currentValue,
            targetValue,
            startValue,
            direction
        );

        return (
            <Badge
                ref={ref}
                variant={statusInfo.variant}
                className={cn(
                    'font-medium transition-colors duration-200',
                    statusInfo.className,
                    className
                )}
                {...props}
            >
                {statusInfo.label}
            </Badge>
        );
    }
);
StatusIndicator.displayName = 'StatusIndicator';

export { StatusIndicator };
export type { StatusLabels };
