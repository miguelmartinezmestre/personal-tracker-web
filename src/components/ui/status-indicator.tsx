'use client';

import * as React from 'react';
import { cn } from '@/lib/ui-utils/utils';
import { Badge } from '@/components/ui/badge';
import { computeObjectiveProgressPercent } from '@/features/objectives/components/objectives-utils';

interface StatusIndicatorProps {
    status: string;
    deadline?: number;
    currentValue?: number;
    targetValue?: number;
    startValue?: number;
    direction?: string;
    className?: string;
}

const getStatusInfo = (
    status: string,
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
                label: 'Completed',
                variant: 'default' as const,
                className: 'bg-green-500 hover:bg-green-600 text-white',
            };
        case 'active':
            if (isOverdue) {
                return {
                    label: 'Overdue',
                    variant: 'destructive' as const,
                    className: 'bg-red-500 hover:bg-red-600 text-white',
                };
            }
            if (progress >= 75) {
                return {
                    label: 'On Track',
                    variant: 'default' as const,
                    className: 'bg-green-500 hover:bg-green-600 text-white',
                };
            }
            if (progress >= 50) {
                return {
                    label: 'In Progress',
                    variant: 'secondary' as const,
                    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                };
            }
            return {
                label: 'At Risk',
                variant: 'destructive' as const,
                className: 'bg-orange-500 hover:bg-orange-600 text-white',
            };
        case 'paused':
            return {
                label: 'Paused',
                variant: 'outline' as const,
                className: 'bg-gray-500 hover:bg-gray-600 text-white',
            };
        case 'archived':
            return {
                label: 'Archived',
                variant: 'outline' as const,
                className: 'bg-gray-400 hover:bg-gray-500 text-white',
            };
        case 'deleted':
            return {
                label: 'Deleted',
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
    ({ status, deadline, currentValue, targetValue, startValue, direction, className, ...props }, ref) => {
        const statusInfo = getStatusInfo(
            status,
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
