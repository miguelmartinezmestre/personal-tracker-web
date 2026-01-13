'use client';

import {
    createContext,
    useContext,
    useCallback,
    useMemo,
    useState,
    useEffect,
    type ReactNode,
    useRef,
    useSyncExternalStore,
} from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import type { CallPropsAction } from '@/types/tour';
import type {
    TourContextValue,
    TourState,
    TourId,
    TourAnalyticsEvent,
} from '@/types/tour';
import { useUser } from '@/contexts/user-context';
import { getTourDefinition, getAllTourIds, MAX_TARGET_RETRIES, RETRY_DELAY_MS } from '@/config/tours';
import { TourTooltip, tourStyles } from './tour-tooltip';
import { recordTourStart } from '@/lib/tour-storage';
import { useTourProgress } from '@/hooks/api/use-tours';

const Joyride = dynamic(() => import('react-joyride').then(mod => mod.default), {
    ssr: false,
});

/**
 * Hook to check if the component has hydrated on the client
 * Uses useSyncExternalStore for React 19 compatibility
 */
function useHasMounted(): boolean {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );
}

/**
 * Tour Provider Context
 */
const TourContext = createContext<TourContextValue | undefined>(undefined);

/**
 * Props for the TourProvider component
 */
interface TourProviderProps {
    children: ReactNode;
}

/**
 * Initial tour state
 */
const initialState: TourState = {
    run: false,
    stepIndex: 0,
    currentTourId: null,
    loading: false,
};

/**
 * Retry state for missing targets
 * Maps tourId+stepIndex to retry count
 */
type RetryKey = `${TourId}-${number}`;

/**
 * Get the translation key for a step's title
 */
function getStepTitleKey(tourId: TourId, stepIndex: number): string {
    return `Tours.${tourId}.steps.${stepIndex}.title`;
}

/**
 * Get the translation key for a step's content
 */
function getStepContentKey(tourId: TourId, stepIndex: number): string {
    return `Tours.${tourId}.steps.${stepIndex}.content`;
}

/**
 * TourProvider Component
 *
 * Manages the state and lifecycle of react-joyride tours.
 * Integrates with Convex for persistence and handles multi-page tours.
 */
export function TourProvider({ children }: TourProviderProps) {
    const hasMounted = useHasMounted();
    const pathname = usePathname();
    const user = useUser();
    const tCommon = useTranslations('Tours.common');

    // Tour state
    const [state, setState] = useState<TourState>(initialState);
    const [retryCount, setRetryCount] = useState<Record<RetryKey, number>>({});

    // Ref to track the current tour definition
    const currentTourRef = useRef<TourId | null>(null);

    /**
     * Log analytics event for tour tracking
     * In production, this would send to your analytics service
     */
    const trackAnalytics = useCallback(
        (event: Omit<TourAnalyticsEvent, 'timestamp' | 'userAgent'>) => {
            const analyticsEvent: TourAnalyticsEvent = {
                ...event,
                timestamp: Date.now(),
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            };
        },
        []
    );

    /**
     * Start a tour
     */
    const startTour = useCallback(
        async (tourId: TourId, startIndex: number = 0) => {
            const tour = getTourDefinition(tourId);

            // Check role requirement
            if (tour.requiredRole) {
                const userRole = (user as { role?: string | string[] })?.role;
                const hasRole =
                    userRole === tour.requiredRole ||
                    (Array.isArray(userRole) && userRole.includes(tour.requiredRole));

                if (!hasRole) {
                    return;
                }
            }

            // Check if current route matches the first step's route (if specified)
            const firstStep = tour.steps[startIndex];
            if (firstStep.route && pathname !== firstStep.route) {
                // Don't auto-start if we're not on the right page
                // The calling code should handle navigation
                console.warn(`⚠️ [TourProvider] Not on the correct route for ${tourId}. Expected: ${firstStep.route}, Current: ${pathname}`);
                return;
            }

            // Record the tour start time
            recordTourStart(tourId);

            // Store the current tour ID for translations
            currentTourRef.current = tourId;

            setState({
                run: true,
                stepIndex: startIndex,
                currentTourId: tourId,
                loading: false,
            });

            trackAnalytics({
                eventType: 'tour_started',
                tourId,
                route: pathname,
                stepIndex: startIndex,
            });
        },
        [user, pathname, trackAnalytics]
    );

    /**
     * Stop the current tour
     */
    const stopTour = useCallback(() => {
        setState(prev => ({
            ...prev,
            run: false,
        }));
    }, []);

    /**
     * Move to the next step
     */
    const nextStep = useCallback(() => {
        setState(prev => ({
            ...prev,
            stepIndex: prev.stepIndex + 1,
        }));
    }, []);

    /**
     * Move to the previous step
     */
    const prevStep = useCallback(() => {
        setState(prev => ({
            ...prev,
            stepIndex: Math.max(0, prev.stepIndex - 1),
        }));
    }, []);

    /**
     * Jump to a specific step
     */
    const goToStep = useCallback((index: number) => {
        setState(prev => ({
            ...prev,
            stepIndex: index,
        }));
    }, []);

    /**
     * Skip the current tour
     */
    const skipTour = useCallback(() => {
        const { currentTourId, stepIndex } = state;

        setState({
            run: false,
            stepIndex: 0,
            currentTourId: null,
            loading: false,
        });

        // Clear retry state for this tour
        if (currentTourId) {
            const newRetryCount = { ...retryCount };
            Object.keys(newRetryCount)
                .filter(key => key.startsWith(`${currentTourId}-`))
                .forEach(key => {
                    delete newRetryCount[key as RetryKey];
                });
            setRetryCount(newRetryCount);
        }

        if (currentTourId) {
            trackAnalytics({
                eventType: 'tour_skipped',
                tourId: currentTourId,
                route: pathname,
                stepIndex,
            });
        }
    }, [state, retryCount, pathname, trackAnalytics]);

    /**
     * Reset a tour's completion status
     */
    const resetTour = useCallback((tourId: TourId) => {
        // This will be handled by the API hook
        // Just update local state if this is the current tour
        setState(prev => {
            if (prev.currentTourId === tourId) {
                return {
                    ...initialState,
                    currentTourId: tourId,
                };
            }
            return prev;
        });
    }, []);

    /**
     * Check if a tour is completed
     * This is a placeholder - actual completion status comes from useTours hook
     */
    const isTourCompleted = useCallback((tourId: TourId): boolean => {
        // This will be replaced with actual state from the useTours hook
        return false;
    }, []);

    /**
     * Get the current step for a tour
     * This is a placeholder - actual progress comes from useTours hook
     */
    const getTourStep = useCallback((tourId: TourId): number => {
        // This will be replaced with actual state from the useTours hook
        return 0;
    }, []);

    /**
     * Handle Joyride callback events
     */
    const handleCallback = useCallback(
        (data: CallPropsAction) => {
            const { action, index, lifecycle, status, type } = data;
            const { currentTourId } = state;

            if (!currentTourId) return;

            const tour = getTourDefinition(currentTourId);

            switch (type) {
                case EVENTS.TOUR_START: {
                    trackAnalytics({
                        eventType: 'tour_started',
                        tourId: currentTourId,
                        route: pathname,
                        stepIndex: index ?? 0,
                    });
                    break;
                }

                case EVENTS.STEP_BEFORE: {
                    const step = tour.steps[index ?? 0];
                    // Check if we're on the correct route for this step
                    if (step.route && pathname !== step.route) {
                        // Pause the tour and wait for route change
                        setState(prev => ({ ...prev, run: false }));
                    }
                    trackAnalytics({
                        eventType: 'tour_step_viewed',
                        tourId: currentTourId,
                        route: pathname,
                        stepIndex: index ?? 0,
                    });
                    break;
                }

                case EVENTS.STEP_AFTER: {
                    const nextIndex = (index ?? 0) + 1;
                    const nextStep = tour.steps[nextIndex];

                    // Check if next step requires a different route
                    if (nextStep?.route && pathname !== nextStep.route) {
                        // Pause the tour - navigation will be handled by the component
                        setState(prev => ({
                            ...prev,
                            stepIndex: nextIndex,
                            run: false,
                        }));
                    } else {
                        // Update step index in state
                        setState(prev => ({
                            ...prev,
                            stepIndex: nextIndex,
                        }));
                    }

                    trackAnalytics({
                        eventType: 'tour_step_completed',
                        tourId: currentTourId,
                        route: pathname,
                        stepIndex: index ?? 0,
                    });
                    break;
                }

                case EVENTS.TARGET_NOT_FOUND: {
                    const retryKey: RetryKey = `${currentTourId}-${index ?? 0}`;
                    const currentRetries = retryCount[retryKey] ?? 0;

                    if (currentRetries < MAX_TARGET_RETRIES) {
                        // Increment retry count and schedule retry
                        setRetryCount(prev => ({
                            ...prev,
                            [retryKey]: currentRetries + 1,
                        }));

                        setTimeout(() => {
                            // Force Joyride to re-check the target
                            setState(prev => ({ ...prev }));
                        }, RETRY_DELAY_MS);

                        trackAnalytics({
                            eventType: 'tour_target_not_found',
                            tourId: currentTourId,
                            route: pathname,
                            stepIndex: index ?? 0,
                        });
                    } else {
                        // Max retries reached - skip this step
                        console.warn(`⏭️ [TourProvider] Max retries reached, skipping step ${index} of ${currentTourId}`);

                        // Move to next step or finish tour
                        const nextIndex = (index ?? 0) + 1;
                        const totalSteps = tour.steps.length;

                        if (nextIndex >= totalSteps) {
                            setState({
                                run: false,
                                stepIndex: 0,
                                currentTourId: null,
                                loading: false,
                            });
                        } else {
                            setState(prev => ({ ...prev, stepIndex: nextIndex }));
                        }
                    }
                    break;
                }

                case EVENTS.TOUR_END: {
                    // Tour ended - could be finished or skipped
                    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
                        setState({
                            run: false,
                            stepIndex: 0,
                            currentTourId: null,
                            loading: false,
                        });

                        trackAnalytics({
                            eventType: status === STATUS.FINISHED ? 'tour_finished' : 'tour_skipped',
                            tourId: currentTourId,
                            route: pathname,
                        });
                    }
                    break;
                }
            }
        },
        [state, pathname, retryCount, trackAnalytics]
    );

    /**
     * Resume tour after navigation
     * When pathname changes to match the current step's route, resume the tour
     */
    useEffect(() => {
        if (state.currentTourId && state.stepIndex > 0 && !state.run) {
            const tour = getTourDefinition(state.currentTourId);
            const step = tour.steps[state.stepIndex];
            if (step?.route && pathname === step.route) {
                // Resume the tour after a brief delay for the page to render
                const timeoutId = setTimeout(() => {
                    setState(prev => ({ ...prev, run: true }));
                }, 300);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [pathname, state.currentTourId, state.stepIndex, state.run]);

    /**
     * Auto-start tours
     * Checks for tours with autoStart=true that haven't been completed
     * Uses Convex as the single source of truth (no localStorage)
     * The completion check is done in startTour() via useTour hook
     */
    useEffect(() => {
        // Wait for client-side hydration to complete before auto-starting tours
        if (!hasMounted) {
            return;
        }

        // Only run auto-start when no tour is currently active
        if (state.currentTourId) {
            return;
        }

        // Get all tour definitions
        const allTours = getAllTourIds();

        // Find tours that should auto-start
        const autoStartTours = allTours
            .map(id => getTourDefinition(id))
            .filter(tour => {
                return tour.autoStart === true;
            });

        if (autoStartTours.length === 0) {
            return;
        }

        let isMounted = true;
        const checkAndStartTour = () => {
            for (const tour of autoStartTours) {
                if (!isMounted) return;

                // Check if we're on the correct route for the first step
                const firstStep = tour.steps[0];
                if (firstStep?.route && pathname !== firstStep.route) {
                    // Don't auto-start if we're not on the right page
                    continue;
                }

                // Start the tour after a delay
                const startDelay = (tour as any).startDelay ?? 1500;
                setTimeout(() => {
                    if (isMounted) {
                        startTour(tour.id as TourId, 0);
                    }
                }, startDelay);

                // Only start one auto-start tour at a time
                break;
            }
        };

        // Delay to ensure page is rendered and user is authenticated
        const timer = setTimeout(checkAndStartTour, 500);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [hasMounted, pathname, state.currentTourId, startTour]);

    /**
     * Handle clicks on tour targets during active tour
     * When user clicks on a highlighted element, advance to next step
     */
    useEffect(() => {
        if (!state.run || !state.currentTourId) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Find closest element with data-tour attribute
            const tourElement = target.closest('[data-tour]') as HTMLElement;

            if (tourElement && state.currentTourId) {
                const tourAttr = tourElement.getAttribute('data-tour');
                const tour = getTourDefinition(state.currentTourId);
                const currentStep = tour.steps[state.stepIndex];

                // If clicked element matches current step's target, advance tour
                if (currentStep && currentStep.target.includes(tourAttr || '')) {
                    nextStep();
                }
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [state.run, state.currentTourId, state.stepIndex, nextStep]);

    /**
     * Prepare Joyride steps from the current tour
     */
    const joyrideSteps = useMemo(() => {
        if (!state.currentTourId) return [];

        const tour = getTourDefinition(state.currentTourId);
        return tour.steps.map((step, index) => ({
            ...step,
            // Store translation keys for the custom tooltip
            title: getStepTitleKey(state.currentTourId!, index),
            content: getStepContentKey(state.currentTourId!, index),
            disableBeacon: step.disableBeacon ?? false,
        }));
    }, [state.currentTourId]);

    /**
     * Context value
     */
    const contextValue = useMemo<TourContextValue>(
        () => ({
            run: state.run,
            stepIndex: state.stepIndex,
            currentTourId: state.currentTourId,
            loading: state.loading,
            startTour,
            stopTour,
            nextStep,
            prevStep,
            goToStep,
            skipTour,
            resetTour,
            isTourCompleted,
            getTourStep,
        }),
        [
            state,
            startTour,
            stopTour,
            nextStep,
            prevStep,
            goToStep,
            skipTour,
            resetTour,
            isTourCompleted,
            getTourStep,
        ]
    );

    return (
        <TourContext.Provider value={contextValue}>
            {children}
            {hasMounted && state.currentTourId && (
                <Joyride
                    key={state.currentTourId}
                    steps={joyrideSteps}
                    run={state.run}
                    stepIndex={state.stepIndex}
                    continuous
                    showProgress={false} // We show progress in custom tooltip
                    showSkipButton={false} // We show skip in custom tooltip
                    tooltipComponent={(props) => (
                        <TourTooltipWithContext
                            {...props}
                            tourId={state.currentTourId!}
                            stepsCount={joyrideSteps.length}
                            tCommon={tCommon}
                        />
                    )}
                    callback={handleCallback}
                    styles={tourStyles}
                    debug={false}
                />
            )}
        </TourContext.Provider>
    );
}

/**
 * Internal component that wraps TourTooltip with translation context
 */
function TourTooltipWithContext(props: Record<string, unknown>) {
    const { tourId, stepsCount, tCommon, index } = props as {
        tourId: TourId;
        stepsCount: number;
        tCommon: ReturnType<typeof useTranslations<'Tours.common'>>;
        index: number;
    };
    const backProps = (props.backProps as { onClick?: () => void }) || {};
    const primaryProps = (props.primaryProps as { onClick?: () => void }) || {};
    const skipProps = (props.skipProps as { onClick?: () => void }) || {};

    const t = useTranslations();

    // Get the translation keys for this step (0-indexed)
    const stepIndex = index;
    const titleKey = `Tours.${tourId}.steps.${stepIndex}.title`;
    const contentKey = `Tours.${tourId}.steps.${stepIndex}.content`;

    return (
        <TourTooltip
            step={stepIndex + 1}
            stepsCount={stepsCount}
            isFirstStep={index === 0}
            isLastStep={index === stepsCount - 1}
            title={t(titleKey)}
            content={t(contentKey)}
            primaryButton={tCommon('finish')}
            secondaryButton={tCommon('prev')}
            handleBack={backProps.onClick ?? (() => {})}
            handleNext={primaryProps.onClick ?? (() => {})}
            handleClose={skipProps.onClick ?? (() => {})}
            handleSkip={skipProps.onClick ?? (() => {})}
            hidden={false}
        />
    );
}

/**
 * Hook to access the tour context
 * Throws an error if used outside of TourProvider
 */
export function useTour(): TourContextValue {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}

/**
 * Hook to access the tour context with a fallback
 * Returns null if used outside of TourProvider
 */
export function useTourOptional(): TourContextValue | null {
    return useContext(TourContext) ?? null;
}
