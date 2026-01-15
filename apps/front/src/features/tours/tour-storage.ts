// 'use client';

// import type { TourId, TourStorage } from '@/features/tours/types/tour';
// export type { TourStorage };

// /**
//  * LocalStorage keys for tour persistence.
//  */
// const STORAGE_KEYS = {
//     completed: (tourId: TourId) => `tour:${tourId}:completed`,
//     stepIndex: (tourId: TourId) => `tour:${tourId}:stepIndex`,
//     lastSeen: (tourId: TourId) => `tour:${tourId}:lastSeen`,
//     startedAt: (tourId: TourId) => `tour:${tourId}:startedAt`,
// } as const;

// /**
//  * Completion flag value in localStorage.
//  */
// const COMPLETED_FLAG = '1';

// /**
//  * Maximum retries for localStorage operations (fallback handling).
//  */
// const MAX_STORAGE_RETRIES = 2;

// /**
//  * Safe localStorage wrapper with error handling.
//  * Returns null on failure (e.g., privacy mode, quota exceeded).
//  */
// function safeGetItem(key: string): string | null {
//     let retries = 0;
//     while (retries < MAX_STORAGE_RETRIES) {
//         try {
//             return localStorage.getItem(key);
//         } catch {
//             retries++;
//         }
//     }
//     return null;
// }

// /**
//  * Safe localStorage setter with error handling.
//  * Returns false on failure.
//  */
// function safeSetItem(key: string, value: string): boolean {
//     let retries = 0;
//     while (retries < MAX_STORAGE_RETRIES) {
//         try {
//             localStorage.setItem(key, value);
//             return true;
//         } catch {
//             retries++;
//         }
//     }
//     return false;
// }

// /**
//  * Safe localStorage remover with error handling.
//  */
// function safeRemoveItem(key: string): boolean {
//     let retries = 0;
//     while (retries < MAX_STORAGE_RETRIES) {
//         try {
//             localStorage.removeItem(key);
//             return true;
//         } catch {
//             retries++;
//         }
//     }
//     return false;
// }

// /**
//  * Parse a stored timestamp, returning null if invalid or too old.
//  */
// function parseTimestamp(value: string | null, maxAgeMs?: number): number | null {
//     if (!value) return null;
//     const timestamp = parseInt(value, 10);
//     if (Number.isNaN(timestamp)) return null;
//     if (maxAgeMs && Date.now() - timestamp > maxAgeMs) return null;
//     return timestamp;
// }

// /**
//  * LocalStorage-based tour storage implementation.
//  * Provides offline capability with sync to backend via separate hooks.
//  *
//  * This implementation uses localStorage as a fallback layer.
//  * The primary storage is handled by Convex via useTours API hooks.
//  */
// export class LocalTourStorage implements TourStorage {
//     /**
//      * Get all completed tour IDs from localStorage.
//      * This is a fast local check; the source of truth is Convex.
//      */
//     async getCompletedTours(_userId: string): Promise<Set<TourId>> {
//         const completed = new Set<TourId>();

//         // Check known tour IDs
//         const tourIds: TourId[] = ['onboarding', 'objectives-feature', 'achievements-feature', 'teams-feature'];

//         for (const tourId of tourIds) {
//             const flag = safeGetItem(STORAGE_KEYS.completed(tourId));
//             if (flag === COMPLETED_FLAG) {
//                 completed.add(tourId);
//             }
//         }

//         return completed;
//     }

//     /**
//      * Get the current step index for a tour from localStorage.
//      * Returns 0 if no progress is stored.
//      */
//     async getTourProgress(_userId: string, tourId: TourId): Promise<number> {
//         const stepStr = safeGetItem(STORAGE_KEYS.stepIndex(tourId));
//         if (!stepStr) return 0;

//         const step = parseInt(stepStr, 10);
//         return Number.isNaN(step) ? 0 : Math.max(0, step);
//     }

//     /**
//      * Mark a tour as completed in localStorage.
//      */
//     async markCompleted(_userId: string, tourId: TourId): Promise<void> {
//         safeSetItem(STORAGE_KEYS.completed(tourId), COMPLETED_FLAG);
//         safeSetItem(STORAGE_KEYS.lastSeen(tourId), Date.now().toString());
//     }

//     /**
//      * Save the current step for a tour in localStorage.
//      */
//     async saveProgress(_userId: string, tourId: TourId, stepIndex: number): Promise<void> {
//         safeSetItem(STORAGE_KEYS.stepIndex(tourId), stepIndex.toString());
//         safeSetItem(STORAGE_KEYS.lastSeen(tourId), Date.now().toString());
//     }

//     /**
//      * Reset all stored data for a tour.
//      */
//     async resetTour(_userId: string, tourId: TourId): Promise<void> {
//         safeRemoveItem(STORAGE_KEYS.completed(tourId));
//         safeRemoveItem(STORAGE_KEYS.stepIndex(tourId));
//         safeRemoveItem(STORAGE_KEYS.lastSeen(tourId));
//         safeRemoveItem(STORAGE_KEYS.startedAt(tourId));
//     }
// }

// /**
//  * Singleton instance of local storage.
//  */
// export const localTourStorage = new LocalTourStorage();

// /**
//  * Record that a tour was started.
//  * Used for analytics and to distinguish new vs returning users.
//  */
// export function recordTourStart(tourId: TourId): void {
//     safeSetItem(STORAGE_KEYS.startedAt(tourId), Date.now().toString());
// }

// /**
//  * Get when a tour was first started.
//  * Returns null if the tour was never started.
//  */
// export function getTourStartTime(tourId: TourId): number | null {
//     const value = safeGetItem(STORAGE_KEYS.startedAt(tourId));
//     return parseTimestamp(value);
// }

// /**
//  * Get when a tour was last seen.
//  * Returns null if the tour was never viewed.
//  */
// export function getTourLastSeen(tourId: TourId): number | null {
//     const value = safeGetItem(STORAGE_KEYS.lastSeen(tourId));
//     return parseTimestamp(value);
// }

// /**
//  * Check if a tour is completed using localStorage.
//  * This is a fast local check; use useTours for authoritative state.
//  */
// export function isTourCompletedLocally(tourId: TourId): boolean {
//     return safeGetItem(STORAGE_KEYS.completed(tourId)) === COMPLETED_FLAG;
// }

// /**
//  * Clear all tour data (for testing or logout).
//  */
// export function clearAllTourData(): void {
//     const tourIds: TourId[] = ['onboarding', 'objectives-feature', 'achievements-feature', 'teams-feature'];
//     for (const tourId of tourIds) {
//         safeRemoveItem(STORAGE_KEYS.completed(tourId));
//         safeRemoveItem(STORAGE_KEYS.stepIndex(tourId));
//         safeRemoveItem(STORAGE_KEYS.lastSeen(tourId));
//         safeRemoveItem(STORAGE_KEYS.startedAt(tourId));
//     }
// }
