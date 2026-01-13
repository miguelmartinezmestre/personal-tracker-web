'use client';

import type { Step as JoyrideStep, Styles as JoyrideStyles } from 'react-joyride';
import { STATUS, ACTIONS, EVENTS } from 'react-joyride';

// Get the proper types from react-joyride
type ActionsType = typeof ACTIONS;
type StatusType = typeof STATUS;
type EventsType = typeof EVENTS;

/**
 * Joyride callback data type.
 * Re-exported for convenience.
 */
export type CallPropsAction = {
    action: ActionsType[keyof ActionsType] | null;
    index: number;
    lifecycle: string | null;
    origin: unknown | null;
    status: StatusType[keyof StatusType] | null;
    step: Record<string, unknown> | undefined;
    type: EventsType[keyof EventsType];
};

/**
 * Unique identifiers for all available tours in the application.
 */
export type TourId = 'onboarding' | 'objectives-feature' | 'achievements-feature' | 'teams-feature';

/**
 * Extended step configuration that includes route awareness for multi-page tours.
 */
export interface TourStep extends Omit<JoyrideStep, 'content'> {
    /**
     * CSS selector or data-tour attribute for the target element.
     * Prefixed with 'data-tour' convention for stability.
     */
    target: string;

    /**
     * Optional route where this step should be displayed.
     * Used for multi-page tours to handle navigation.
     */
    route?: string;

    /**
     * Translation key for the step title.
     * Will be resolved via next-intl.
     */
    title?: string;

    /**
     * Translation key for the step content.
     * Will be resolved via next-intl.
     */
    content?: string;

    /**
     * Translation key for the next button label.
     * Defaults to common translation if not provided.
     */
    nextLabel?: string;

    /**
     * Translation key for the previous button label.
     * Defaults to common translation if not provided.
     */
    prevLabel?: string;

    /**
     * Translation key for the skip button label.
     * Defaults to common translation if not provided.
     */
    skipLabel?: string;

    /**
     * Whether to disable the beacon and show tooltip immediately.
     */
    disableBeacon?: boolean;

    /**
     * Placement of the tooltip relative to the target.
     */
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';

    /**
     * Offset in pixels from the target.
     */
    offset?: number;

    /**
     * Allow clicks outside the spotlight.
     */
    spotlightClicks?: boolean;

    /**
     * Disable the overlay spotlight.
     */
    disableOverlay?: boolean;

    /**
     * Hide the close button.
     */
    hideCloseButton?: boolean;

    /**
     * Hide the footer with navigation buttons.
     */
    hideFooter?: boolean;

    /**
     * Hide the back button.
     */
    hideBackButton?: boolean;
}

/**
 * Complete tour configuration with metadata and steps.
 */
export interface Tour {
    /** Unique identifier for this tour */
    id: TourId;

    /** Ordered steps for the tour */
    steps: ReadonlyArray<TourStep>;

    /** Auto-start this tour for eligible users */
    autoStart?: boolean;

    /** Only show once per user (don't repeat after completion) */
    runOnce?: boolean;

    /** Required user role to access this tour */
    requiredRole?: 'user' | 'admin';

    /** Delay in ms before auto-starting (for smooth page load) */
    startDelay?: number;
}

/**
 * Current state of the tour provider.
 */
export interface TourState {
    /** Whether a tour is currently running */
    run: boolean;

    /** Current step index (controlled mode) */
    stepIndex: number;

    /** ID of the currently active tour */
    currentTourId: TourId | null;

    /** Whether tour operations are in progress (loading) */
    loading: boolean;
}

/**
 * User's tour progress data from backend.
 */
export interface TourProgress {
    /** Unique identifier for the tour */
    tourId: TourId;

    /** Whether the user has completed this tour */
    completed: boolean;

    /** Current step index for resuming incomplete tours */
    currentStep?: number;

    /** Timestamp when the tour was last seen */
    lastSeenAt: number;

    /** Timestamp when the tour was completed */
    completedAt?: number;

    /** Timestamp when the tour was first started */
    startedAt?: number;
}

/**
 * Analytics event types for tour tracking.
 */
export type TourAnalyticsEventType =
    | 'tour_started'
    | 'tour_step_viewed'
    | 'tour_step_completed'
    | 'tour_target_not_found'
    | 'tour_skipped'
    | 'tour_finished';

/**
 * Analytics event data for tour tracking.
 */
export interface TourAnalyticsEvent {
    /** Type of analytics event */
    eventType: TourAnalyticsEventType;

    /** Tour identifier */
    tourId: TourId;

    /** Current step index (if applicable) */
    stepIndex?: number;

    /** Current route/pathname */
    route: string;

    /** Event timestamp */
    timestamp: number;

    /** User agent string (optional, for debugging) */
    userAgent?: string;
}

/**
 * Actions available from the tour context.
 */
export interface TourActions {
    /** Start a specific tour, optionally from a specific step */
    startTour: (tourId: TourId, startIndex?: number) => void;

    /** Stop the current tour */
    stopTour: () => void;

    /** Move to the next step */
    nextStep: () => void;

    /** Move to the previous step */
    prevStep: () => void;

    /** Jump to a specific step */
    goToStep: (index: number) => void;

    /** Skip the current tour */
    skipTour: () => void;

    /** Reset a tour's progress (allow re-running) */
    resetTour: (tourId: TourId) => void;

    /** Check if a tour is completed */
    isTourCompleted: (tourId: TourId) => boolean;

    /** Get a tour's current step index */
    getTourStep: (tourId: TourId) => number;
}

/**
 * Combined tour context value (state + actions).
 */
export interface TourContextValue extends TourState, TourActions {}

/**
 * Custom tooltip props for our shadcn-styled component.
 */
export interface TourTooltipProps {
    /** Current step number (1-indexed) */
    step: number;

    /** Total number of steps */
    stepsCount: number;

    /** Whether this is the first step */
    isFirstStep: boolean;

    /** Whether this is the last step */
    isLastStep: boolean;

    /** Step title (translated) */
    title?: string;

    /** Step content (translated) */
    content?: string;

    /** Label for the primary button */
    primaryButton?: string;

    /** Label for the secondary button */
    secondaryButton?: string;

    /** Show the beacon instead of tooltip */
    beacon?: boolean;

    /** Handler for back/previous action */
    handleBack: () => void;

    /** Handler for close action */
    handleClose: () => void;

    /** Handler for next/finish action */
    handleNext: () => void;

    /** Handler for skip action */
    handleSkip: () => void;

    /** Whether tooltip should be hidden */
    hidden?: boolean;
}

/**
 * Storage interface for tour persistence (can be swapped for server-side).
 */
export interface TourStorage {
    /** Get all completed tour IDs for a user */
    getCompletedTours(userId: string): Promise<Set<TourId>>;

    /** Get the current step for a tour */
    getTourProgress(userId: string, tourId: TourId): Promise<number>;

    /** Mark a tour as completed */
    markCompleted(userId: string, tourId: TourId): Promise<void>;

    /** Save the current step for a tour */
    saveProgress(userId: string, tourId: TourId, stepIndex: number): Promise<void>;

    /** Reset a tour's progress */
    resetTour(userId: string, tourId: TourId): Promise<void>;
}

/**
 * Tour styles configuration using shadcn CSS variables.
 */
export type TourStyles = JoyrideStyles;
