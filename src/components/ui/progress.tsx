"use client";

import type { ComponentProps } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

type ProgressProps = Omit<ComponentProps<typeof ProgressPrimitive.Root>, 'aria-label' | 'aria-labelledby'> & (
    | { 'aria-label': string; 'aria-labelledby'?: string }
    | { 'aria-label'?: string; 'aria-labelledby': string }
);

function Progress({ className, value, ...props }: ProgressProps) {
    const normalizedValue = typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    return (
        <ProgressPrimitive.Root data-slot="progress" value={normalizedValue} max={100} className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)} {...props}>
            <ProgressPrimitive.Indicator data-slot="progress-indicator" className="bg-primary h-full w-full flex-1 transition-all" style={{ transform: `translateX(-${100 - normalizedValue}%)` }} />
        </ProgressPrimitive.Root>
    );
}
export { Progress };
