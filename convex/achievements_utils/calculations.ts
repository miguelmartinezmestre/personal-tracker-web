import { QueryCtx, MutationCtx } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { TIME } from '../utils/constants';

/**
 * Calculate user streak for query context
 * Counts consecutive days with progress updates
 */
export async function calculateUserStreak(ctx: QueryCtx, userId: Id<'user'>): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    // Fetch progress updates for each objective using indexed queries
    const userUpdates = await Promise.all(
        objectiveIds.map(async objectiveId => {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .collect();
            return updates;
        })
    )
        .then(results => results.flat())
        .then(updates =>
            updates.sort(
                (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) =>
                    b.updateDate - a.updateDate
            )
        );

    if (userUpdates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Get unique days with activity
    const activityDays = new Set<number>();
    for (const update of userUpdates) {
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
 * Calculate user streak for mutation context (same logic, different ctx type)
 */
export async function calculateUserStreakInternal(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    // Fetch progress updates for each objective using indexed queries
    const userUpdates = await Promise.all(
        objectiveIds.map(async objectiveId => {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .collect();
            return updates;
        })
    )
        .then(results => results.flat())
        .then(updates =>
            updates.sort(
                (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) =>
                    b.updateDate - a.updateDate
            )
        );

    if (userUpdates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activityDays = new Set<number>();
    for (const update of userUpdates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    const mostRecentDay = sortedDays[0];
    if (mostRecentDay === undefined || mostRecentDay < todayMs - TIME.DAY_MS) {
        return 0;
    }

    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= TIME.DAY_MS;
        } else if (day < expectedDay) {
            break;
        }
    }

    return streak;
}

/**
 * Calculate organization streak based on all member activity
 */
export async function calculateOrganizationStreak(
    ctx: QueryCtx,
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

    // Fetch progress updates for each objective using indexed queries
    const organizationUpdates = await Promise.all(
        objectiveIds.map(async objectiveId => {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .collect();
            return updates;
        })
    )
        .then(results => results.flat())
        .then(updates =>
            updates.sort(
                (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) =>
                    b.updateDate - a.updateDate
            )
        );

    if (organizationUpdates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activityDays = new Set<number>();
    for (const update of organizationUpdates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    const mostRecentDay = sortedDays[0];
    if (mostRecentDay === undefined || mostRecentDay < todayMs - TIME.DAY_MS) {
        return 0;
    }

    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= TIME.DAY_MS;
        } else if (day < expectedDay) {
            break;
        }
    }

    return streak;
}
