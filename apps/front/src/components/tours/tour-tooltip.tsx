'use client';

import { X, XCircle } from 'lucide-react';
import type { TourTooltipProps } from '@/types/tour';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';

/**
 * Custom tooltip component for react-joyride.
 * Uses shadcn/ui Card component for consistent styling across light/dark themes.
 */
export function TourTooltip({
    step,
    stepsCount,
    isFirstStep,
    isLastStep,
    title,
    content,
    primaryButton,
    secondaryButton,
    handleBack,
    handleNext,
    handleClose,
    handleSkip,
    hidden,
}: TourTooltipProps) {
    if (hidden) return null;

    return (
        <div className="relative z-[9999] max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-popover text-popover-foreground rounded-lg border shadow-lg overflow-hidden">
                {/* Header with title and close button */}
                {(title || !isLastStep) && (
                    <div className="flex items-start justify-between px-4 pt-4 pb-2">
                        {title && (
                            <h3 className="text-sm font-semibold leading-none tracking-tight pr-8">
                                {title}
                            </h3>
                        )}
                        <button
                            onClick={handleClose}
                            className="absolute top-3 right-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
                            aria-label="Close tour"
                            type="button"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                )}

                {/* Content */}
                {content && (
                    <div className="px-4 pb-4 pt-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {content}
                        </p>
                    </div>
                )}

                {/* Footer with progress indicator and navigation buttons */}
                <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
                    {/* Step progress indicator */}
                    <Badge variant="secondary" className="text-xs">
                        {step} / {stepsCount}
                    </Badge>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-2">
                        {/* Skip button - shown on non-last steps */}
                        {!isLastStep && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSkip}
                                className="h-8 text-xs"
                                type="button"
                            >
                                <XCircle className="h-3 w-3 mr-1" />
                                Skip
                            </Button>
                        )}

                        {/* Back button - hidden on first step */}
                        {!isFirstStep && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBack}
                                className="h-8 text-xs"
                                type="button"
                            >
                                {secondaryButton || 'Back'}
                            </Button>
                        )}

                        {/* Primary button - Next or Finish */}
                        <Button
                            variant={isLastStep ? 'default' : 'default'}
                            size="sm"
                            onClick={handleNext}
                            className="h-8 text-xs"
                            type="button"
                        >
                            {primaryButton || (isLastStep ? 'Finish' : 'Next')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Arrow/pointer - positioned by Joyride, we just add the visual element */}
            <div
                className={cn(
                    'absolute w-3 h-3 bg-popover border rotate-45',
                    // Position will be adjusted by Joyride's floater
                    'bottom-[-6px] left-1/2 -translate-x-1/2 border-b-0 border-r-0'
                )}
                style={{
                    // Override via Joyride's styles prop
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                }}
            />
        </div>
    );
}

/**
 * Default tooltip styles for react-joyride.
 * These use shadcn CSS variables for theme consistency.
 */
export const tourStyles = {
    options: {
        zIndex: 9999,
        // Use shadcn CSS variables for theming
        primaryColor: 'hsl(var(--primary))',
        primaryTextColor: 'hsl(var(--primary-foreground))',
        overlayColor: 'hsl(var(--background) / 0.75)',
        // Spotlight styles
        spotlightShadow: '0 0 0 9999px hsl(var(--background) / 0.75)',
        spotlightBorderRadius: 8,
        // Animation
        transitionDuration: 200,
    },
    // Disable default tooltip as we use custom component
    tooltip: {
        display: 'none',
    },
    floaterProps: {
        disableAnimation: false,
    },
} as const;
