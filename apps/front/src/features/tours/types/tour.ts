// 'use client';

// import type { Step, Tour as NextStepTour } from 'nextstepjs';

// /**
//  * Unique identifiers for all available tours in the application.
//  */
// export type TourId = 'onboarding' | 'objectives-feature' | 'achievements-feature' | 'teams-feature';

// /**
//  * Extended step configuration that includes route awareness for multi-page tours.
//  * Based on NextStepjs Step type with additional metadata for our app.
//  */
// export interface TourStep {
//     /**
//      * CSS selector for the target element (id-based selector, e.g., '#step1').
//      * If not provided, the card will be displayed centered on the document.
//      */
//     selector?: string;

//     /**
//      * Optional route where this step should be displayed.
//      * Used for multi-page tours to handle navigation.
//      */
//     route?: string;

//     /**
//      * Position of the tooltip relative to the target.
//      */
//     side?: 'top' | 'bottom' | 'left' | 'right';

//     /**
//      * Whether to show control buttons (next, prev).
//      */
//     showControls?: boolean;

//     /**
//      * Whether to show the skip button.
//      */
//     showSkip?: boolean;

//     /**
//      * Whether to disable the beacon and show tooltip immediately.
//      * In NextStepjs this is controlled via the tour config.
//      */
//     disableBeacon?: boolean;

//     /**
//      * Padding around the pointer (keyhole) highlighting the target element.
//      */
//     pointerPadding?: number;

//     /**
//      * Border-radius of the pointer (keyhole) highlighting the target element.
//      */
//     pointerRadius?: number;

//     /**
//      * Whether to block keyboard control for this step.
//      */
//     blockKeyboardControl?: boolean;

//     /**
//      * The id of the viewport element to use for positioning.
//      * If not provided, the document body will be used.
//      */
//     viewportID?: string;

//     /**
//      * Icon to display in the tour card header.
//      */
//     icon?: string;
// }

// /**
//  * Complete tour configuration with metadata and steps.
//  */
// export interface Tour {
//     /** Unique identifier for this tour */
//     id: TourId;

//     /** Ordered steps for the tour */
//     steps: ReadonlyArray<TourStep>;

//     /** Auto-start this tour for eligible users */
//     autoStart?: boolean;

//     /** Only show once per user (don't repeat after completion) */
//     runOnce?: boolean;

//     /** Required user role to access this tour */
//     requiredRole?: 'user' | 'admin';

//     /** Delay in ms before auto-starting (for smooth page load) */
//     startDelay?: number;
// }

// /**
//  * Current state of the tour provider.
//  */
// export interface TourState {
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
//  * User's tour progress data from backend.
//  */
// export interface TourProgress {
//     /** Unique identifier for the tour */
//     tourId: TourId;

//     /** Whether the user has completed this tour */
//     completed: boolean;

//     /** Current step index for resuming incomplete tours */
//     currentStep?: number;

//     /** Timestamp when the tour was last seen */
//     lastSeenAt: number;

//     /** Timestamp when the tour was completed */
//     completedAt?: number;

//     /** Timestamp when the tour was first started */
//     startedAt?: number;
// }

// /**
//  * Analytics event types for tour tracking.
//  */
// export type TourAnalyticsEventType =
//     | 'tour_started'
//     | 'tour_step_viewed'
//     | 'tour_step_completed'
//     | 'tour_target_not_found'
//     | 'tour_skipped'
//     | 'tour_finished';

// /**
//  * Analytics event data for tour tracking.
//  */
// export interface TourAnalyticsEvent {
//     /** Type of analytics event */
//     eventType: TourAnalyticsEventType;

//     /** Tour identifier */
//     tourId: TourId;

//     /** Current step index (if applicable) */
//     stepIndex?: number;

//     /** Current route/pathname */
//     route: string;

//     /** Event timestamp */
//     timestamp: number;

//     /** User agent string (optional, for debugging) */
//     userAgent?: string;
// }

// /**
//  * Actions available from the tour context.
//  */
// export interface TourActions {
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
// export interface TourContextValue extends TourState, TourActions {}

// /**
//  * Storage interface for tour persistence (can be swapped for server-side).
//  */
// export interface TourStorage {
//     /** Get all completed tour IDs for a user */
//     getCompletedTours(userId: string): Promise<Set<TourId>>;

//     /** Get the current step for a tour */
//     getTourProgress(userId: string, tourId: TourId): Promise<number>;

//     /** Mark a tour as completed */
//     markCompleted(userId: string, tourId: TourId): Promise<void>;

//     /** Save the current step for a tour */
//     saveProgress(userId: string, tourId: TourId, stepIndex: number): Promise<void>;

//     /** Reset a tour's progress */
//     resetTour(userId: string, tourId: TourId): Promise<void>;
// }

// /**
//  * Re-export Step type from nextstepjs for convenience.
//  */
// export type { Step, NextStepTour };
