import { queryWithRLS, mutationWithRLS } from './rls';
import { v } from 'convex/values';

/**
 * Get all tour progress for the current user.
 * Returns an array of tour progress records.
 */
export const getTourProgress = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity.subject);

        const tours = await ctx.db
            .query('userTours')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        return tours.map(tour => ({
            tourId: tour.tourId as 'onboarding' | 'objectives-feature' | 'achievements-feature' | 'organizations-feature',
            completed: tour.completed,
            currentStep: tour.currentStep,
            lastSeenAt: tour.lastSeenAt,
            completedAt: tour.completedAt,
            startedAt: tour.startedAt,
        }));
    },
});

/**
 * Get progress for a specific tour.
 * Returns null if the user has never started this tour.
 */
export const getTour = queryWithRLS({
    args: {
        tourId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        if (!tour) {
            return null;
        }

        return {
            tourId: tour.tourId as 'onboarding' | 'objectives-feature' | 'achievements-feature' | 'organizations-feature',
            completed: tour.completed,
            currentStep: tour.currentStep,
            lastSeenAt: tour.lastSeenAt,
            completedAt: tour.completedAt,
            startedAt: tour.startedAt,
        };
    },
});

/**
 * Check if a specific tour is completed.
 * Returns false if the tour has never been started or is not completed.
 */
export const isTourCompleted = queryWithRLS({
    args: {
        tourId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        return tour?.completed ?? false;
    },
});

/**
 * Initialize or update a tour when it starts.
 * Creates a new record if this is the first time, or updates the startedAt timestamp.
 */
export const startTour = mutationWithRLS({
    args: {
        tourId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        // Check if a record already exists
        const existing = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        const now = Date.now();

        if (existing) {
            // Update existing record - reset if it was completed, otherwise just update lastSeenAt
            await ctx.db.patch(existing._id, {
                lastSeenAt: now,
                // If the tour was completed before, reset it for a replay
                completed: false,
                currentStep: 0,
                completedAt: undefined,
            });
        } else {
            // Create new record
            await ctx.db.insert('userTours', {
                user: userId,
                tourId: args.tourId,
                completed: false,
                currentStep: 0,
                lastSeenAt: now,
                startedAt: now,
            });
        }

        return { success: true };
    },
});

/**
 * Update the current step of a tour in progress.
 * Called after each step is completed or viewed.
 */
export const updateTourProgress = mutationWithRLS({
    args: {
        tourId: v.string(),
        stepIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        if (!tour) {
            // Create the record if it doesn't exist
            await ctx.db.insert('userTours', {
                user: userId,
                tourId: args.tourId,
                completed: false,
                currentStep: args.stepIndex,
                lastSeenAt: Date.now(),
                startedAt: Date.now(),
            });
        } else {
            // Update the step index and last seen time
            await ctx.db.patch(tour._id, {
                currentStep: args.stepIndex,
                lastSeenAt: Date.now(),
            });
        }

        return { success: true };
    },
});

/**
 * Mark a tour as completed.
 * Called when the user finishes all steps.
 */
export const completeTour = mutationWithRLS({
    args: {
        tourId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        const now = Date.now();

        if (tour) {
            await ctx.db.patch(tour._id, {
                completed: true,
                completedAt: now,
                lastSeenAt: now,
            });
        } else {
            // Create a completed record if it doesn't exist
            await ctx.db.insert('userTours', {
                user: userId,
                tourId: args.tourId,
                completed: true,
                completedAt: now,
                lastSeenAt: now,
                startedAt: now,
            });
        }

        return { success: true };
    },
});

/**
 * Record that a tour was skipped.
 * Does NOT mark as completed - user can restart later.
 */
export const skipTour = mutationWithRLS({
    args: {
        tourId: v.string(),
        stepIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        const now = Date.now();

        if (tour) {
            await ctx.db.patch(tour._id, {
                lastSeenAt: now,
                // Update step index to where they left off
                currentStep: args.stepIndex ?? tour.currentStep,
            });
        } else {
            // Create a record showing they started but didn't complete
            await ctx.db.insert('userTours', {
                user: userId,
                tourId: args.tourId,
                completed: false,
                currentStep: args.stepIndex ?? 0,
                lastSeenAt: now,
                startedAt: now,
            });
        }

        return { success: true };
    },
});

/**
 * Reset a tour's progress, allowing the user to start over.
 * Clears completion status and resets step to 0.
 */
export const resetTour = mutationWithRLS({
    args: {
        tourId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity.subject);

        const tour = await ctx.db
            .query('userTours')
            .withIndex('by_user_tour', q => q.eq('user', userId).eq('tourId', args.tourId))
            .first();

        const now = Date.now();

        if (tour) {
            await ctx.db.patch(tour._id, {
                completed: false,
                currentStep: 0,
                completedAt: undefined,
                lastSeenAt: now,
            });
        } else {
            // Create a fresh record
            await ctx.db.insert('userTours', {
                user: userId,
                tourId: args.tourId,
                completed: false,
                currentStep: 0,
                lastSeenAt: now,
                startedAt: now,
            });
        }

        return { success: true };
    },
});
