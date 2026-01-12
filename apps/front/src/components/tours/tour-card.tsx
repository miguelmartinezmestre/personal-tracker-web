'use client';

import { X, XCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CardComponentProps } from 'nextstepjs';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';

/**
 * Custom card component for NextStepjs tours.
 * Uses shadcn/ui components for consistent styling across light/dark themes.
 * Integrates with next-intl for translations.
 */
export function TourCard({
    step,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    arrow,
}: CardComponentProps) {
    const tCommon = useTranslations('Tours.common');

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    return (
        <div className="relative z-[9999] max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-popover text-popover-foreground rounded-lg border shadow-lg overflow-hidden">
                {/* Header with icon, title and close button */}
                <div className="flex items-start justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2 pr-8">
                        {step.icon && (
                            <span className="text-xl flex-shrink-0">{step.icon}</span>
                        )}
                        {step.title && (
                            <h3 className="text-sm font-semibold leading-none tracking-tight">
                                {step.title}
                            </h3>
                        )}
                    </div>
                    <button
                        onClick={skipTour}
                        className="absolute top-3 right-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                        aria-label={tCommon('close')}
                        type="button"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">{tCommon('close')}</span>
                    </button>
                </div>

                {/* Content */}
                {step.content && (
                    <div className="px-4 pb-4 pt-2">
                        <div className="text-sm text-muted-foreground leading-relaxed">
                            {step.content}
                        </div>
                    </div>
                )}

                {/* Arrow for positioning - provided by NextStepjs */}
                {arrow}

                {/* Footer with progress indicator and navigation buttons */}
                {step.showControls && (
                    <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
                        {/* Step progress indicator */}
                        <Badge variant="secondary" className="text-xs">
                            {currentStep + 1} / {totalSteps}
                        </Badge>

                        {/* Navigation buttons */}
                        <div className="flex items-center gap-2">
                            {/* Skip button - shown on non-last steps when showSkip is true */}
                            {step.showSkip && !isLastStep && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={skipTour}
                                    className="h-8 text-xs"
                                    type="button"
                                >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {tCommon('skip')}
                                </Button>
                            )}

                            {/* Back button - hidden on first step */}
                            {!isFirstStep && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={prevStep}
                                    className="h-8 text-xs"
                                    type="button"
                                >
                                    <ChevronLeft className="h-3 w-3 mr-1" />
                                    {tCommon('prev')}
                                </Button>
                            )}

                            {/* Primary button - Next or Finish */}
                            <Button
                                variant="default"
                                size="sm"
                                onClick={nextStep}
                                className="h-8 text-xs"
                                type="button"
                            >
                                {isLastStep ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        {tCommon('finish')}
                                    </>
                                ) : (
                                    <>
                                        {tCommon('next')}
                                        <ChevronRight className="h-3 w-3 ml-1" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TourCard;
