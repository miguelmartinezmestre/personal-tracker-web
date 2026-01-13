'use client';

import type { Tour, TourId } from '@/types/tour';

/**
 * Maximum number of retries when a target element is not found.
 */
export const MAX_TARGET_RETRIES = 10;

/**
 * Delay between retries in milliseconds (requestAnimationFrame timing).
 */
export const RETRY_DELAY_MS = 100;

/**
 * Tour definitions for the application.
 * Each tour has a unique ID, ordered steps, and metadata.
 *
 * Steps use data-tour attributes for stable targeting.
 * Example: <button data-tour="create-objective-btn" />
 */
export const TOUR_DEFINITIONS: Record<TourId, Tour> = {
    /**
     * Onboarding Tour - Complete interactive tutorial
     * Guides new users through the app basics
     */
    onboarding: {
        id: 'onboarding',
        autoStart: true,
        runOnce: true,
        startDelay: 1500,
        steps: [
            // Step 0: Welcome on dashboard
            {
                target: '[data-tour="welcome-message"]',
                disableBeacon: true,
                placement: 'bottom',
            },
            // Step 1: Point to sidebar objectives link - click to navigate
            {
                target: '[data-tour="sidebar-objectives"]',
                placement: 'right',
            },
            // Step 2: After navigation, show create button (on objectives page)
            {
                target: '[data-tour="create-objective-btn"]',
                route: '/dashboard/objectives',
                placement: 'bottom',
            },
            // Step 3: Explain the objectives list area
            {
                target: '[data-tour="objectives-list"]',
                route: '/dashboard/objectives',
                placement: 'top',
            },
            // Step 4: Back to sidebar - show achievements
            {
                target: '[data-tour="sidebar-achievements"]',
                route: '/dashboard/objectives',
                placement: 'right',
            },
            // Step 5: After navigation, show achievements widget
            {
                target: '[data-tour="achievements-widget"]',
                route: '/dashboard/achievements',
                placement: 'left',
            },
            // Step 6: Show settings
            {
                target: '[data-tour="sidebar-settings"]',
                placement: 'right',
            },
        ],
    },

    /**
     * Objectives Feature Tour
     * Demonstrates the objectives tracking functionality
     */
    'objectives-feature': {
        id: 'objectives-feature',
        autoStart: false,
        runOnce: false,
        steps: [
            {
                target: '[data-tour="sidebar-objectives"]',
                route: '/dashboard/objectives',
                placement: 'right',
            },
            {
                target: '[data-tour="create-objective-btn"]',
                route: '/dashboard/objectives',
                placement: 'bottom',
            },
            {
                target: '[data-tour="objectives-list"]',
                route: '/dashboard/objectives',
                placement: 'top',
            },
            {
                target: '[data-tour="objective-filters"]',
                route: '/dashboard/objectives',
                placement: 'bottom',
            },
        ],
    },

    /**
     * Achievements Feature Tour
     * Demonstrates the achievements and badges system
     */
    'achievements-feature': {
        id: 'achievements-feature',
        autoStart: false,
        runOnce: false,
        steps: [
            {
                target: '[data-tour="sidebar-achievements"]',
                route: '/dashboard/achievements',
                placement: 'right',
            },
            {
                target: '[data-tour="achievements-grid"]',
                route: '/dashboard/achievements',
                placement: 'top',
            },
            {
                target: '[data-tour="achievement-filters"]',
                route: '/dashboard/achievements',
                placement: 'bottom',
            },
            {
                target: '[data-tour="achievement-stats"]',
                route: '/dashboard/achievements',
                placement: 'left',
            },
        ],
    },

    /**
     * Teams Feature Tour
     * Demonstrates team management functionality (admin only)
     */
    'teams-feature': {
        id: 'teams-feature',
        autoStart: false,
        runOnce: false,
        requiredRole: 'admin',
        steps: [
            {
                target: '[data-tour="sidebar-admin"]',
                route: '/dashboard/admin-panel',
                placement: 'right',
            },
            {
                target: '[data-tour="admin-users-table"]',
                route: '/dashboard/admin-panel',
                placement: 'top',
            },
            {
                target: '[data-tour="admin-audit-logs"]',
                route: '/dashboard/admin-panel',
                placement: 'left',
            },
        ],
    },
};

/**
 * Get a tour definition by ID.
 */
export function getTourDefinition(tourId: TourId): Tour {
    return TOUR_DEFINITIONS[tourId];
}

/**
 * Get all tour IDs.
 */
export function getAllTourIds(): TourId[] {
    return Object.keys(TOUR_DEFINITIONS) as TourId[];
}

/**
 * Check if a tour exists.
 */
export function tourExists(tourId: string): tourId is TourId {
    return tourId in TOUR_DEFINITIONS;
}
