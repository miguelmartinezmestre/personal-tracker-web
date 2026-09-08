'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { currentUtcCivilDay, toUtcCivilDay } from '@shared/civil-date';
interface StatusLabels {
    active?: string;
    completed?: string;
    overdue?: string;
}
const DEFAULT_LABELS: Required<StatusLabels> = {
    active: 'Active',
    completed: 'Completed',
    overdue: 'Overdue',
};
interface StatusIndicatorProps {
    status: string;
    deadline?: number;
    className?: string;
    labels?: StatusLabels;
}
const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(({ status, deadline, className, labels, ...props }, ref) => {
    const [now] = React.useState(Date.now);
    const mergedLabels: Required<StatusLabels> = { ...DEFAULT_LABELS, ...labels };
    const normalizedStatus = status.toLowerCase();
    const isOverdue = normalizedStatus === 'active' && typeof deadline === "number" &&
        toUtcCivilDay(deadline) < currentUtcCivilDay(now);
    const resolved = isOverdue
        ? {
            label: mergedLabels.overdue,
            variant: 'destructive' as const,
            className: 'bg-red-500 hover:bg-red-600 text-white',
        }
        : normalizedStatus === 'completed'
            ? {
                label: mergedLabels.completed,
                variant: 'default' as const,
                className: 'bg-green-600 hover:bg-green-700 text-white',
            }
            : {
                label: mergedLabels.active,
                variant: 'secondary' as const,
                className: 'bg-blue-500 hover:bg-blue-600 text-white',
            };
    return (<Badge ref={ref} variant={resolved.variant} className={cn('font-medium transition-colors duration-200', resolved.className, className)} {...props}>
                {resolved.label}
            </Badge>);
});
StatusIndicator.displayName = 'StatusIndicator';
export { StatusIndicator };
export type { StatusLabels };
