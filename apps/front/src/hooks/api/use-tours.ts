'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { TourId, TourProgress } from '@/types/tour';
import { useUser } from '@/contexts/user-context';

/**
 * Hook to get all tour progress for the current user.
 * Returns an array of tour progress records from Convex.
 * Only executes when user is authenticated.
 */
export function useTourProgress() {
    const user = useUser();

    const result = useQuery({
        ...convexQuery(api.tours.getTourProgress, {}),
        enabled: !!user, // Only run when user is authenticated
    });
    return result;
}

/**
 * Hook to get progress for a specific tour.
 * Returns null if the user has never started this tour.
 * Only executes when user is authenticated.
 */
export function useTour(tourId: TourId) {
    const user = useUser();

    return useQuery({
        ...convexQuery(api.tours.getTour, { tourId }),
        enabled: !!user && !!tourId, // Only run when user is authenticated
    });
}

/**
 * Hook to check if a specific tour is completed.
 * Returns false if the tour has never been started or is not completed.
 * Only executes when user is authenticated.
 */
export function useIsTourCompleted(tourId: TourId) {
    const user = useUser();

    return useQuery({
        ...convexQuery(api.tours.isTourCompleted, { tourId }),
        enabled: !!user, // Only run when user is authenticated
    });
}

/**
 * Hook to get the completed tours as a Set for easy lookup.
 */
export function useCompletedTours() {
    const { data: progressData, ...rest } = useTourProgress();

    const completedSet = new Set<TourId>(
        progressData?.filter(p => p.completed).map(p => p.tourId as TourId) ?? []
    );

    return {
        completedTours: completedSet,
        ...rest,
    };
}

/** Hook to start a tour */
export function useStartTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.tours.startTour),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/** Hook to update tour progress */
export function useUpdateTourProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.tours.updateTourProgress),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/** Hook to mark a tour as completed */
export function useCompleteTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.tours.completeTour),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/** Hook to record that a tour was skipped */
export function useSkipTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.tours.skipTour),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/** Hook to reset a tour's progress */
export function useResetTour() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.tours.resetTour),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/**
 * Helper hook to get the current step index for a tour.
 * Returns the step to resume from, or 0 if not started.
 */
export function useTourResumeStep(tourId: TourId): number {
    const { data: tourData } = useTour(tourId);

    // If tour is completed, return 0 (restart from beginning)
    if (tourData?.completed) {
        return 0;
    }

    // Return the saved step index, or 0 if not available
    return tourData?.currentStep ?? 0;
}
