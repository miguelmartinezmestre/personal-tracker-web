'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface CircularProgressProps extends React.ComponentPropsWithoutRef<
    typeof ProgressPrimitive.Root
> {
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    value?: number;
    max?: number;
    className?: string;
    'aria-label': string;
}

const CircularProgress = React.forwardRef<
    React.ComponentRef<typeof ProgressPrimitive.Root>,
    CircularProgressProps
>(({ size = 'md', showValue = true, value = 0, max = 100, className, ...props }, ref) => {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
    const percentage = (safeValue / safeMax) * 100;

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    return (
        <div
            className={cn(
                'relative inline-flex items-center justify-center',
                sizeClasses[size],
                className
            )}
        >
            <ProgressPrimitive.Root
                ref={ref}
                {...props}
                value={safeValue}
                max={safeMax}
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
            {showValue && (
                <div
                    aria-hidden="true"
                    className={cn(
                        'absolute inset-0 flex items-center justify-center font-medium',
                        textSizeClasses[size]
                    )}
                >
                    {Math.round(percentage)}%
                </div>
            )}
        </div>
    );
});
CircularProgress.displayName = 'CircularProgress';

export { CircularProgress };
