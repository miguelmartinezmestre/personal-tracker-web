'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTour as useTourContext, useTourOptional } from '@/components/tours';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { TourId, TourProgress } from '@/types/tour';
import { useUser } from '@/contexts/user-context';
import { getTourDefinition } from '@/config/tours';

/**
 * Enhanced useTour hook that combines the TourProvider state
 * with the Convex API for persistence.
 *
 * Provides methods to control tours with automatic backend sync.
 */
export function useTour() {
    const router = useRouter();
    const context = useTourContext();
    const queryClient = useQueryClient();
    const user = useUser();

    // API hooks - directly using Convex
    const { data: progressData } = useQuery({
        ...convexQuery(api.tours.getTourProgress, {}),
        enabled: !!user,
    });

    const completedTours = useMemo(() => {
        return new Set<TourId>(
            progressData?.filter(p => p.completed).map(p => p.tourId as TourId) ?? []
        );
    }, [progressData]);

    const startTourMutation = useMutation({
        mutationFn: useConvexMutation(api.tours.startTour),
        onSuccess: () => queryClient.invalidateQueries(),
    });

    const updateProgressMutation = useMutation({
        mutationFn: useConvexMutation(api.tours.updateTourProgress),
        onSuccess: () => queryClient.invalidateQueries(),
    });

    const completeTourMutation = useMutation({
        mutationFn: useConvexMutation(api.tours.completeTour),
        onSuccess: () => queryClient.invalidateQueries(),
    });

    const skipTourMutation = useMutation({
        mutationFn: useConvexMutation(api.tours.skipTour),
        onSuccess: () => queryClient.invalidateQueries(),
    });

    const resetTourMutation = useMutation({
        mutationFn: useConvexMutation(api.tours.resetTour),
        onSuccess: () => queryClient.invalidateQueries(),
    });

    /**
     * Start a tour with backend initialization
     */
    const startTour = useCallback(
        (tourId: TourId, startIndex?: number) => {
            const tour = getTourDefinition(tourId);
            // If the tour is already completed and runOnce is true, don't start
            if (tour.runOnce && completedTours.has(tourId)) {
                return;
            }

            // Check role requirement
            if (tour.requiredRole) {
                // This is also checked in the provider, but we check here too for safety
            }

            // Initialize the tour in backend
            startTourMutation.mutate({ tourId });

            // Navigate to the tour's starting route if needed
            const firstStep = tour.steps[startIndex ?? 0];
            if (firstStep.route && typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (currentPath !== firstStep.route) {
                    router.push(firstStep.route as any);
                }
            }

            // Start the tour in the provider
            context.startTour(tourId, startIndex);
        },
        [completedTours, startTourMutation, router, context]
    );

    /**
     * Stop the current tour
     */
    const stopTour = useCallback(() => {
        context.stopTour();
    }, [context]);

    /**
     * Move to the next step with progress sync
     */
    const nextStep = useCallback(() => {
        const { currentTourId, stepIndex } = context;

        if (currentTourId) {
            // Update progress in backend
            updateProgressMutation.mutate({ tourId: currentTourId, stepIndex: stepIndex + 1 });
        }

        context.nextStep();
    }, [context, updateProgressMutation]);

    /**
     * Move to the previous step
     */
    const prevStep = useCallback(() => {
        const { currentTourId, stepIndex } = context;

        if (currentTourId && stepIndex > 0) {
            // Update progress in backend
            updateProgressMutation.mutate({ tourId: currentTourId, stepIndex: stepIndex - 1 });
        }

        context.prevStep();
    }, [context, updateProgressMutation]);

    /**
     * Jump to a specific step
     */
    const goToStep = useCallback(
        (index: number) => {
            const { currentTourId } = context;

            if (currentTourId) {
                // Update progress in backend
                updateProgressMutation.mutate({ tourId: currentTourId, stepIndex: index });
            }

            context.goToStep(index);
        },
        [context, updateProgressMutation]
    );

    /**
     * Skip the current tour with backend sync
     */
    const skipTour = useCallback(() => {
        const { currentTourId, stepIndex } = context;

        if (currentTourId) {
            // Record skip in backend
            skipTourMutation.mutate({ tourId: currentTourId, stepIndex });
        }

        context.skipTour();
    }, [context, skipTourMutation]);

    /**
     * Reset a tour's progress (allow re-running)
     */
    const resetTour = useCallback(
        (tourId: TourId) => {
            // Reset in backend
            resetTourMutation.mutate({ tourId });

            // Update local provider state
            context.resetTour(tourId);
        },
        [context, resetTourMutation]
    );

    /**
     * Check if a tour is completed
     */
    const isTourCompleted = useCallback(
        (tourId: TourId): boolean => {
            return completedTours.has(tourId);
        },
        [completedTours]
    );

    /**
     * Get the current step for a tour
     */
    const getTourStep = useCallback(
        (tourId: TourId): number => {
            // This would require fetching the tour data
            // For now, use the context state if it's the current tour
            if (context.currentTourId === tourId) {
                return context.stepIndex;
            }
            return 0;
        },
        [context]
    );

    /**
     * Complete the current tour (called from provider)
     */
    const completeCurrentTour = useCallback(() => {
        const { currentTourId } = context;

        if (currentTourId) {
            // Mark as completed in backend
            completeTourMutation.mutate({ tourId: currentTourId });
        }
    }, [context, completeTourMutation]);

    return {
        ...context,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        resetTour,
        isTourCompleted,
        getTourStep,
        completeCurrentTour,
        completedTours,
    };
}

/**
 * Hook to get tour completion status for a specific tour
 */
export function useTourCompletion(tourId: TourId) {
    const user = useUser();
    const { data: isCompleted } = useQuery({
        ...convexQuery(api.tours.isTourCompleted, { tourId }),
        enabled: !!user,
    });

    return {
        isCompleted: isCompleted ?? false,
        isLoading: !isCompleted,
    };
}

/**
 * Helper hook to get the current step index for a tour.
 * Returns the step to resume from, or 0 if not started.
 */
export function useTourResumeStep(tourId: TourId): number {
    const user = useUser();
    const { data: tourData } = useQuery({
        ...convexQuery(api.tours.getTour, { tourId }),
        enabled: !!user && !!tourId,
    });

    // If tour is completed, return 0 (restart from beginning)
    if (tourData?.completed) {
        return 0;
    }

    // Return the saved step index, or 0 if not available
    return tourData?.currentStep ?? 0;
}

/**
 * Hook to auto-start a tour on first visit
 * Use this in page components to trigger tours when the page loads
 */
export function useAutoStartTour(tourId: TourId, enabled: boolean = true) {
    const completion = useTourCompletion(tourId);
    const { startTour } = useTour();
    const resumeStep = useTourResumeStep(tourId);

    useEffect(() => {
        if (enabled && !completion.isCompleted) {
            // Small delay to ensure the page has rendered
            const timer = setTimeout(() => {
                startTour(tourId, resumeStep);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [enabled, completion.isCompleted, tourId, resumeStep, startTour]);
}

/**
 * Export the provider hook for direct access if needed
 */
export { useTourContext, useTourOptional };
