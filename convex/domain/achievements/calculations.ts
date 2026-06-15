import type { DatabaseReader } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { TIME, ERROR_CODES } from '../../utils/constants';
import { ConvexError } from 'convex/values';

type ReadCtx = { db: DatabaseReader };

export function isEarlyBirdCompletion(objective: {
    status: string;
    deadline?: number;
    completedAt?: number;
}): boolean {
    return (
        objective.status === 'completed' &&
        objective.deadline != null &&
        objective.completedAt != null &&
        objective.completedAt <= objective.deadline
    );
}

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

function startOfDayMs(ms: number): number {
    const date = new Date(ms);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

// Counts consecutive activity days ending today/yesterday from updates streamed
// newest-first. Stops at the first day-gap, so it reads only as far back as the
// current streak reaches instead of loading the whole history.
async function countStreakFromOrderedUpdates(
    updates: AsyncIterable<{ updateDate: number }>
): Promise<number> {
    const todayMs = startOfDayMs(Date.now());

    let streak = 0;
    let expectedDay: number | null = null;

    for await (const update of updates) {
        const day = startOfDayMs(update.updateDate);

        if (expectedDay === null) {
            // Anchor on the most recent activity; if it predates yesterday there is no streak.
            if (day < todayMs - TIME.DAY_MS) {
                return 0;
            }
            streak = 1;
            expectedDay = day - TIME.DAY_MS;
            continue;
        }

        if (day === expectedDay) {
            streak++;
            expectedDay -= TIME.DAY_MS;
        } else if (day > expectedDay) {
            // Another update on an already-counted day — skip the duplicate.
            continue;
        } else {
            // A day was skipped: the streak ended here.
            break;
        }
    }

    return streak;
}

export async function calculateUserStreak(
    ctx: ReadCtx,
    userId: Id<'user'>,
    organizationId: Id<'organization'>
): Promise<number> {
    const membership = await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', organizationId).eq('userId', userId)
        )
        .first();

    if (!membership) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    const userUpdates = ctx.db
        .query('progressUpdates')
        .withIndex('by_user_organization_date', q =>
            q.eq('userId', userId).eq('organizationId', organizationId)
        )
        .order('desc');

    return countStreakFromOrderedUpdates(userUpdates);
}

export async function calculateOrganizationStreak(
    ctx: ReadCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const organizationUpdates = ctx.db
        .query('progressUpdates')
        .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
        .order('desc');

    return countStreakFromOrderedUpdates(organizationUpdates);
}
