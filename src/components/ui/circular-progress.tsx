'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface CircularProgressProps
    extends Omit<
        React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
        'value' | 'max'
    > {
    value: number;
    'aria-label': string;
}

const CircularProgress = React.forwardRef<
    React.ComponentRef<typeof ProgressPrimitive.Root>,
    CircularProgressProps
>(({ value, className, ...props }, ref) => {
    const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
    const percentage = safeValue;

    return (
        <div
            className={cn(
                'relative inline-flex h-8 w-8 items-center justify-center',
                className
            )}
        >
            <ProgressPrimitive.Root
                ref={ref}
                {...props}
                value={safeValue}
                max={100}
                className={cn(
                    'relative h-full w-full overflow-hidden rounded-full bg-secondary',
                    className
                )}
            >
                <ProgressPrimitive.Indicator
                    className="h-full w-full transition-all duration-300 ease-in-out"
                    style={{
                        transform: `rotate(-90deg)`,
                        transformOrigin: 'center',
                        background: `conic-gradient(from 0deg, var(--primary) ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`,
                        mask: 'radial-gradient(circle, transparent 58%, black 60%)',
                    }}
                />
            </ProgressPrimitive.Root>
            <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-xs font-medium"
            >
                {Math.round(percentage)}%
            </div>
        </div>
    );
});
CircularProgress.displayName = 'CircularProgress';

export { CircularProgress };
