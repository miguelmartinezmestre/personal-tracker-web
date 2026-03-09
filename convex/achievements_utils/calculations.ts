import type { GenericDatabaseReader } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';
import { Doc, Id } from '../_generated/dataModel';
import { TIME } from '../utils/constants';

/** Minimal context needed for streak calculations — both QueryCtx and MutationCtx satisfy this. */
type ReadCtx = { db: GenericDatabaseReader<DataModel> };

/**
 * Compute a streak (consecutive days) from a list of items that each carry an `updateDate` timestamp.
 * The array does NOT need to be pre-sorted.
 */
export function countStreakFromUpdates(updates: Array<{ updateDate: number }>): number {
    if (updates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Get unique days with activity
    const activityDays = new Set<number>();
    for (const update of updates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    // Check if there's activity today or yesterday (to maintain streak)
    const mostRecentDay = sortedDays[0];
    if (mostRecentDay === undefined || mostRecentDay < todayMs - TIME.DAY_MS) {
        return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= TIME.DAY_MS;
        } else if (day < expectedDay) {
            break; // Gap in streak
        }
    }

    return streak;
}

/**
 * Fetch all progress updates for a set of objective IDs.
 */
async function fetchProgressUpdates(
    ctx: ReadCtx,
    objectiveIds: Id<'objectives'>[]
): Promise<Doc<'progressUpdates'>[]> {
    return Promise.all(
        objectiveIds.map(async objectiveId => {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .collect();
            return updates;
        })
    ).then(results => results.flat());
}

/**
 * Calculate user streak — counts consecutive days with progress updates.
 * Works with both QueryCtx and MutationCtx.
 */
export async function calculateUserStreak(ctx: ReadCtx, userId: Id<'user'>): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const userUpdates = await fetchProgressUpdates(ctx, objectiveIds);

    return countStreakFromUpdates(userUpdates);
}

/**
 * Calculate organization streak based on all member activity.
 */
export async function calculateOrganizationStreak(
    ctx: ReadCtx,
    memberUserIds: Id<'user'>[]
): Promise<number> {
    // Get organization objectives using indexed queries per user
    const organizationObjectives = await Promise.all(
        memberUserIds.map(async userId => {
            const userObjectives = await ctx.db
                .query('objectives')
                .withIndex('by_user', q => q.eq('userId', userId))
                .collect();
            return userObjectives;
        })
    ).then(results => results.flat());

    const objectiveIds = organizationObjectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const organizationUpdates = await fetchProgressUpdates(ctx, objectiveIds);

    return countStreakFromUpdates(organizationUpdates);
}
