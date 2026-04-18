import type { DatabaseReader } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { TIME } from '../utils/constants';

const LIST_LIMIT = 1000;

type ReadCtx = { db: DatabaseReader };

export function countStreakFromUpdates(updates: Array<{ updateDate: number }>): number {
    if (updates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activityDays = new Set<number>();
    for (const update of updates) {
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

async function fetchProgressUpdates(
    ctx: ReadCtx,
    objectiveIds: Id<'objectives'>[]
): Promise<Doc<'progressUpdates'>[]> {
    return Promise.all(
        objectiveIds.slice(0, 100).map(async objectiveId => {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .take(50);
            return updates;
        })
    ).then(results => results.flat());
}

export async function calculateUserStreak(ctx: ReadCtx, userId: Id<'user'>): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(LIST_LIMIT);

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const userUpdates = await fetchProgressUpdates(ctx, objectiveIds);

    return countStreakFromUpdates(userUpdates);
}

export async function calculateOrganizationStreak(
    ctx: ReadCtx,
    memberUserIds: Id<'user'>[]
): Promise<number> {
    const organizationObjectives = await Promise.all(
        memberUserIds.slice(0, 100).map(async userId => {
            const userObjectives = await ctx.db
                .query('objectives')
                .withIndex('by_user', q => q.eq('userId', userId))
                .take(50);
            return userObjectives;
        })
    ).then(results => results.flat());

    const objectiveIds = organizationObjectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const organizationUpdates = await fetchProgressUpdates(ctx, objectiveIds);

    return countStreakFromUpdates(organizationUpdates);
}
