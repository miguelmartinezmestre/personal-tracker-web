// 'use client';

// import type { Tour, TourId, TourStep } from '@/features/tours/types/tour';

// /**
//  * Maximum number of retries when a target element is not found.
//  */
// export const MAX_TARGET_RETRIES = 10;

// /**
//  * Delay between retries in milliseconds.
//  */
// export const RETRY_DELAY_MS = 100;

// /**
//  * Helper to create a tour step with consistent configuration.
//  */
// function createStep(
//     selector: string,
//     options?: {
//         side?: 'top' | 'bottom' | 'left' | 'right';
//         route?: string;
//         showControls?: boolean;
//         showSkip?: boolean;
//         disableBeacon?: boolean;
//         pointerPadding?: number;
//         pointerRadius?: number;
//         icon?: string;
//     }
// ): TourStep {
//     return {
//         selector,
//         side: options?.side ?? 'bottom',
//         showControls: options?.showControls ?? true,
//         showSkip: options?.showSkip ?? true,
//         disableBeacon: options?.disableBeacon ?? false,
//         ...options,
//     };
// }

// /**
//  * Onboarding tour steps.
//  */
// const onboardingSteps: readonly TourStep[] = [
//     // Step 0: Welcome on dashboard - use the sidebar menu which is visible
//     createStep('[data-tour="sidebar-menu"]', {
//         side: 'right',
//         icon: '🎉',
//     }),
//     // Step 1: Point to sidebar objectives link - click to navigate
//     createStep('[data-tour="sidebar-objectives"]', {
//         side: 'right',
//         route: '/dashboard/objectives',
//     }),
//     // Step 2: After navigation, show create button (on objectives page)
//     createStep('[data-tour="create-objective-btn"]', {
//         side: 'bottom',
//     }),
//     // Step 3: Explain the objectives list area
//     createStep('[data-tour="objectives-list"]', {
//         side: 'top',
//     }),
//     // Step 4: Back to sidebar - show achievements
//     createStep('[data-tour="sidebar-achievements"]', {
//         side: 'right',
//         route: '/dashboard/achievements',
//     }),
//     // Step 5: After navigation, show achievements widget
//     createStep('[data-tour="achievements-widget"]', {
//         side: 'left',
//         icon: '🏆',
//     }),
//     // Step 6: Show settings
//     createStep('[data-tour="sidebar-settings"]', {
//         side: 'right',
//     }),
// ] as const;

// /**
//  * Objectives feature tour steps.
//  */
// const objectivesFeatureSteps: readonly TourStep[] = [
//     createStep('[data-tour="sidebar-objectives"]', {
//         side: 'right',
//         route: '/dashboard/objectives',
//     }),
//     createStep('[data-tour="create-objective-btn"]', {
//         side: 'bottom',
//     }),
//     createStep('[data-tour="objectives-list"]', {
//         side: 'top',
//     }),
//     createStep('[data-tour="objective-filters"]', {
//         side: 'bottom',
//     }),
// ] as const;

// /**
//  * Achievements feature tour steps.
//  */
// const achievementsFeatureSteps: readonly TourStep[] = [
//     createStep('[data-tour="sidebar-achievements"]', {
//         side: 'right',
//         route: '/dashboard/achievements',
//     }),
//     createStep('[data-tour="achievements-grid"]', {
//         side: 'top',
//     }),
//     createStep('[data-tour="achievement-filters"]', {
//         side: 'bottom',
//     }),
//     createStep('[data-tour="achievement-stats"]', {
//         side: 'left',
//     }),
// ] as const;

// /**
//  * Teams feature tour steps (admin only).
//  */
// const teamsFeatureSteps: readonly TourStep[] = [
//     createStep('[data-tour="sidebar-admin-sessions"]', {
//         side: 'right',
//         route: '/dashboard/admin/sessions',
//     }),
//     createStep('[data-tour="admin-sessions"]', {
//         side: 'top',
//     }),
//     createStep('[data-tour="sidebar-admin-audit"]', {
//         side: 'right',
//         route: '/dashboard/admin/audit',
//     }),
//     createStep('[data-tour="admin-audit-logs"]', {
//         side: 'left',
//     }),
// ] as const;

// /**
//  * Tour definitions for the application.
//  * Each tour has a unique ID, ordered steps, and metadata.
//  */
// export const TOUR_DEFINITIONS = {
//     /**
//      * Onboarding Tour - Complete interactive tutorial
//      * Guides new users through the app basics
//      */
//     onboarding: {
//         id: 'onboarding',
//         autoStart: true,
//         runOnce: true,
//         startDelay: 1500,
//         steps: onboardingSteps,
//     },

//     /**
//      * Objectives Feature Tour
//      * Demonstrates the objectives tracking functionality
//      */
//     'objectives-feature': {
//         id: 'objectives-feature',
//         autoStart: false,
//         runOnce: false,
//         steps: objectivesFeatureSteps,
//     },

//     /**
//      * Achievements Feature Tour
//      * Demonstrates the achievements and badges system
//      */
//     'achievements-feature': {
//         id: 'achievements-feature',
//         autoStart: false,
//         runOnce: false,
//         steps: achievementsFeatureSteps,
//     },

//     /**
//      * Teams Feature Tour
//      * Demonstrates team management functionality (admin only)
//      */
//     'teams-feature': {
//         id: 'teams-feature',
//         autoStart: false,
//         runOnce: false,
//         requiredRole: 'admin',
//         steps: teamsFeatureSteps,
//     },
// } as const;

// /**
//  * Get a tour definition by ID.
//  */
// export function getTourDefinition(tourId: TourId): Tour {
//     return TOUR_DEFINITIONS[tourId] as Tour;
// }

// /**
//  * Get all tour IDs.
//  */
// export function getAllTourIds(): TourId[] {
//     return Object.keys(TOUR_DEFINITIONS) as TourId[];
// }

// /**
//  * Check if a tour exists.
//  */
// export function tourExists(tourId: string): tourId is TourId {
//     return tourId in TOUR_DEFINITIONS;
// }

// /**
//  * Get the translation key for a step's title.
//  * Format: Tours.{tourId}.steps.{stepIndex}.title
//  */
// export function getStepTitleKey(tourId: TourId, stepIndex: number): string {
//     return `Tours.${tourId}.steps.${stepIndex}.title`;
// }

// /**
//  * Get the translation key for a step's content.
//  * Format: Tours.{tourId}.steps.{stepIndex}.content
//  */
// export function getStepContentKey(tourId: TourId, stepIndex: number): string {
//     return `Tours.${tourId}.steps.${stepIndex}.content`;
// }

// /**
//  * Get the full translation key for a step.
//  */
// export function getStepKey(tourId: TourId, stepIndex: number): string {
//     return `Tours.${tourId}.steps.${stepIndex}`;
// }
