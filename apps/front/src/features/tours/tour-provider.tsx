// 'use client';

// import {
//     createContext,
//     useContext,
//     useCallback,
//     useMemo,
//     useEffect,
//     type ReactNode,
//     useRef,
//     useState,
//     useSyncExternalStore,
// } from 'react';
// import { usePathname, useRouter } from 'next/navigation';
// import { useNextStep } from 'nextstepjs';
// import type { TourId, TourAnalyticsEvent } from '@/features/tours/types/tour';
// import { getTourDefinition, getAllTourIds } from '@/features/tours/config/tours';
// import {
//     recordTourStart,
//     isTourCompletedLocally,
//     type TourStorage,
// } from '@/features/tours/tour-storage';

// // Enable debug logging in development
// const DEBUG = process.env.NODE_ENV === 'development';

// /**
//  * Hook to check if the component has hydrated on the client.
//  * Uses useSyncExternalStore for React 19 compatibility.
//  */
// function useHasMounted(): boolean {
//     return useSyncExternalStore(
//         () => () => { },
//         () => true,
//         () => false
//     );
// }

// /**
//  * Tour Provider Context
//  */
// const TourContext = createContext<TourContextValue | undefined>(undefined);

// /**
//  * Props for the TourProvider component.
//  */
// interface TourProviderProps {
//     children: ReactNode;
//     tourStorage?: TourStorage;
// }

// /**
//  * Current state of the tour provider.
//  */
// interface TourState {
//     /** Whether a tour is currently running */
//     run: boolean;
//     /** Current step index (controlled mode) */
//     stepIndex: number;
//     /** ID of the currently active tour */
//     currentTourId: TourId | null;
//     /** Whether tour operations are in progress (loading) */
//     loading: boolean;
// }

// /**
//  * Actions available from the tour context.
//  */
// interface TourActions {
//     /** Start a specific tour, optionally from a specific step */
//     startTour: (tourId: TourId, startIndex?: number) => void;
//     /** Stop the current tour */
//     stopTour: () => void;
//     /** Move to the next step */
//     nextStep: () => void;
//     /** Move to the previous step */
//     prevStep: () => void;
//     /** Jump to a specific step */
//     goToStep: (index: number) => void;
//     /** Skip the current tour */
//     skipTour: () => void;
//     /** Reset a tour's progress (allow re-running) */
//     resetTour: (tourId: TourId) => void;
//     /** Check if a tour is completed */
//     isTourCompleted: (tourId: TourId) => boolean;
//     /** Get a tour's current step index */
//     getTourStep: (tourId: TourId) => Promise<number>;
// }

// /**
//  * Combined tour context value (state + actions).
//  */
// export interface TourContextValue extends TourState, TourActions { }

// /**
//  * Initial tour state.
//  */
// const initialState: TourState = {
//     run: false,
//     stepIndex: 0,
//     currentTourId: null,
//     loading: false,
// };

// /**
//  * TourProvider Component
//  *
//  * Manages the state and lifecycle of NextStepjs tours.
//  * Wraps NextStepjs's useNextStep hook to provide a consistent API.
//  */
// export function TourProvider({ children, tourStorage }: TourProviderProps) {
//     const pathname = usePathname();
//     const router = useRouter();
//     // const user = useUser();
//     const hasMounted = useHasMounted();

//     // NextStepjs hooks for tour control
//     const {
//         startNextStep,
//         closeNextStep,
//         setCurrentStep,
//         currentTour,
//         currentStep,
//         isNextStepVisible,
//     } = useNextStep();

//     // Local state for tracking
//     const [state, setState] = useState<TourState>(initialState);
//     const [isInitialized, setIsInitialized] = useState(false);

//     // Refs to track tour state across renders
//     const currentTourRef = useRef<TourId | null>(null);
//     const pendingNavigationRef = useRef<{ stepIndex: number; route: string } | null>(null);

//     /**
//      * Sync NextStepjs state with our local state.
//      */
//     useEffect(() => {
//         setState({
//             run: isNextStepVisible,
//             stepIndex: currentStep,
//             currentTourId: currentTour as TourId | null,
//             loading: false,
//         });
//     }, [isNextStepVisible, currentStep, currentTour]);

//     /**
//      * Log analytics event for tour tracking.
//      * In production, this would send to your analytics service.
//      */
//     const trackAnalytics = useCallback(
//         (event: Omit<TourAnalyticsEvent, 'timestamp' | 'userAgent'>) => {
//             if (DEBUG) {
//                 console.debug('[Tour Analytics]', event);
//             }
//             // TODO: Send to analytics service in production
//         },
//         []
//     );

//     /**
//      * Get user role from user object.
//      */
//     // const getUserRole = useCallback((): string | string[] | undefined => {
//     //     try {
//     //         return (user as { role?: string | string[] })?.role;
//     //     } catch {
//     //         return undefined;
//     //     }
//     // }, [user]);

//     /**
//      * Check if user has required role for a tour.
//      */
//     // const hasRequiredRole = useCallback(
//     //     (requiredRole: string): boolean => {
//     //         const userRole = getUserRole();
//     //         if (!requiredRole) return true;
//     //         return (
//     //             userRole === requiredRole ||
//     //             (Array.isArray(userRole) && userRole.includes(requiredRole))
//     //         );
//     //     },
//     //     [getUserRole]
//     // );

//     /**
//      * Start a tour.
//      */
//     // const startTour = useCallback(
//     //     async (tourId: TourId, startIndex: number = 0) => {
//     //         const tour = getTourDefinition(tourId);

//     //         // Check role requirement
//     //         if (tour.requiredRole && !hasRequiredRole(tour.requiredRole)) {
//     //             if (DEBUG) {
//     //                 console.warn(`[Tour] User does not have required role "${tour.requiredRole}" for "${tourId}"`);
//     //             }
//     //             return;
//     //         }

//     //         const step = tour.steps[startIndex];

//     //         // Navigate to required route if not already there
//     //         if (step?.route && !pathname.startsWith(step.route)) {
//     //             router.push(step.route);
//     //             pendingNavigationRef.current = { stepIndex: startIndex, route: step.route };
//     //             currentTourRef.current = tourId;
//     //             return;
//     //         }

//     //         // Record tour start and begin
//     //         recordTourStart(tourId);
//     //         currentTourRef.current = tourId;
//     //         startNextStep(tourId);

//     //         if (startIndex > 0) {
//     //             setCurrentStep(startIndex);
//     //         }

//     //         trackAnalytics({
//     //             eventType: 'tour_started',
//     //             tourId,
//     //             route: pathname,
//     //             stepIndex: startIndex,
//     //         });
//     //     },
//     //     [pathname, router, startNextStep, setCurrentStep, trackAnalytics, hasRequiredRole]
//     // );

//     /**
//      * Stop the current tour.
//      */
//     const stopTour = useCallback(() => {
//         closeNextStep();
//     }, [closeNextStep]);

//     /**
//      * Move to the next step.
//      */
//     const nextStep = useCallback(() => {
//         setCurrentStep(currentStep + 1);
//     }, [currentStep, setCurrentStep]);

//     /**
//      * Move to the previous step.
//      */
//     const prevStep = useCallback(() => {
//         setCurrentStep(Math.max(0, currentStep - 1));
//     }, [currentStep, setCurrentStep]);

//     /**
//      * Jump to a specific step.
//      */
//     const goToStep = useCallback((index: number) => {
//         setCurrentStep(index);
//     }, [setCurrentStep]);

//     /**
//      * Skip the current tour.
//      */
//     const skipTour = useCallback(() => {
//         closeNextStep();
//         if (state.currentTourId) {
//             trackAnalytics({
//                 eventType: 'tour_skipped',
//                 tourId: state.currentTourId,
//                 route: pathname,
//                 stepIndex: state.stepIndex,
//             });
//         }
//     }, [state, pathname, trackAnalytics, closeNextStep]);

//     /**
//      * Reset a tour's progress.
//      */
//     const resetTour = useCallback(async (tourId: TourId) => {
//         if (tourStorage) {
//             await tourStorage.resetTour('', tourId);
//         }
//         setState(prev =>
//             prev.currentTourId === tourId ? { ...initialState, currentTourId: tourId } : prev
//         );
//     }, [tourStorage]);

//     /**
//      * Check if a tour is completed.
//      */
//     const isTourCompleted = useCallback(
//         (tourId: TourId): boolean => {
//             return isTourCompletedLocally(tourId);
//         },
//         []
//     );

//     /**
//      * Get the current step for a tour.
//      */
//     const getTourStep = useCallback(
//         async (tourId: TourId): Promise<number> => {
//             if (tourStorage) {
//                 const userId = (user as { id?: string })?.id ?? '';
//                 return await tourStorage.getTourProgress(userId, tourId);
//             }
//             return 0;
//         },
//         [tourStorage, user]
//     );

//     /**
//      * Resume tour after navigation.
//      */
//     useEffect(() => {
//         if (!pendingNavigationRef.current) return;

//         const { stepIndex, route } = pendingNavigationRef.current;
//         if (pathname !== route) return;

//         // Navigation completed, start the tour
//         const tourId = currentTourRef.current;
//         if (tourId) {
//             pendingNavigationRef.current = null;
//             const timer = setTimeout(() => {
//                 startNextStep(tourId);
//                 if (stepIndex > 0) {
//                     setCurrentStep(stepIndex);
//                 }
//             }, 300);
//             return () => clearTimeout(timer);
//         }
//     }, [pathname, startNextStep, setCurrentStep]);

//     /**
//      * Auto-start tours on mount.
//      * Only runs once after client-side hydration.
//      */
//     useEffect(() => {
//         // Skip if not mounted yet, already initialized, or tour is visible
//         if (!hasMounted || isInitialized || isNextStepVisible) {
//             return;
//         }

//         setIsInitialized(true);

//         // Find tours that should auto-start
//         const autoStartTours = getAllTourIds()
//             .map(id => getTourDefinition(id))
//             .filter(tour => {
//                 if (tour.autoStart !== true) return false;
//                 // Skip already completed tours if runOnce is true
//                 if (tour.runOnce && isTourCompletedLocally(tour.id)) {
//                     if (DEBUG) {
//                         console.log(`[Tour] Skipping "${tour.id}": already completed`);
//                     }
//                     return false;
//                 }
//                 return true;
//             });

//         if (autoStartTours.length === 0) return;

//         // Check if we can start a tour on the current route
//         let startTourId: TourId | null = null;
//         for (const tour of autoStartTours) {
//             const firstStep = tour.steps[0];

//             // Check route requirement (if any, must start with that route)
//             if (firstStep?.route && !pathname.startsWith(firstStep.route)) {
//                 continue;
//             }

//             // Check if target element exists
//             if (firstStep?.selector && !document.querySelector(firstStep.selector)) {
//                 if (DEBUG) {
//                     console.warn(`[Tour] Target element not found: ${firstStep.selector}`);
//                 }
//                 continue;
//             }

//             startTourId = tour.id as TourId;
//             break;
//         }

//         if (startTourId) {
//             const tour = getTourDefinition(startTourId);
//             const delay = tour.startDelay ?? 1500;
//             const timer = setTimeout(() => startTour(startTourId), delay);
//             return () => clearTimeout(timer);
//         }
//     }, [hasMounted, isInitialized, isNextStepVisible, pathname, startTour]);

//     /**
//      * Context value memoized to prevent unnecessary re-renders.
//      */
//     const contextValue = useMemo<TourContextValue>(
//         () => ({
//             run: state.run,
//             stepIndex: state.stepIndex,
//             currentTourId: state.currentTourId,
//             loading: state.loading,
//             startTour,
//             stopTour,
//             nextStep,
//             prevStep,
//             goToStep,
//             skipTour,
//             resetTour,
//             isTourCompleted,
//             getTourStep,
//         }),
//         [state, startTour, stopTour, nextStep, prevStep, goToStep, skipTour, resetTour, isTourCompleted, getTourStep]
//     );

//     return (
//         <TourContext.Provider value={contextValue}>
//             {children}
//         </TourContext.Provider>
//     );
// }

// /**
//  * Hook to access the tour context.
//  * Throws an error if used outside of TourProvider.
//  */
// export function useTour(): TourContextValue {
//     const context = useContext(TourContext);
//     if (context === undefined) {
//         throw new Error('useTour must be used within a TourProvider');
//     }
//     return context;
// }

// /**
//  * Hook to access the tour context with a fallback.
//  * Returns null if used outside of TourProvider.
//  */
// export function useTourOptional(): TourContextValue | null {
//     return useContext(TourContext) ?? null;
// }
