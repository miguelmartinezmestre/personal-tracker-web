import type { DatabaseReader } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';
import { TIME } from '../../utils/constants';
import { deadlineEndExclusive } from '../../../shared/civil-date';
type ReadCtx = {
    db: DatabaseReader;
};
function startOfDayMs(ms: number): number {
    const date = new Date(ms);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
export function isEarlyBirdCompletion(objective: {
    status: string;
    deadline?: number;
    completedAt?: number;
}): boolean {
    return (
        objective.status === 'completed' &&
        objective.deadline != null &&
        objective.completedAt != null &&
        objective.completedAt < deadlineEndExclusive(objective.deadline)
    );
}
// Product achievements top out at 14 days. Keeping a generous one-year ceiling
// preserves useful UI progress while giving every query a hard read bound.
// Values at the ceiling are intentionally saturated instead of scanning an
// arbitrarily long history in one Convex function.
export const MAX_STREAK_DAYS = 366;
async function countStreakFromIndexedDays(
    mostRecentUpdateDate: number | undefined,
    hasActivityOnDay: (dayStart: number) => Promise<boolean>
): Promise<number> {
    if (mostRecentUpdateDate === undefined) {
        return 0;
    }
    const todayMs = startOfDayMs(Date.now());
    const mostRecentDay = startOfDayMs(mostRecentUpdateDate);
    // Anchor on the most recent activity; if it predates yesterday there is no streak.
    if (mostRecentDay > todayMs || mostRecentDay < todayMs - TIME.DAY_MS) {
        return 0;
    }
    let streak = 1;
    let expectedDay = mostRecentDay - TIME.DAY_MS;
    while (streak < MAX_STREAK_DAYS && (await hasActivityOnDay(expectedDay))) {
        streak++;
        expectedDay -= TIME.DAY_MS;
    }
    return streak;
}
/** Individual achievements are stored once per user, so their streak aggregates
 * activity across every organization. */
export async function calculateGlobalUserStreak(ctx: ReadCtx, userId: Id<'user'>): Promise<number> {
    const mostRecentUpdate = await ctx.db
        .query('progressUpdates')
        .withIndex('by_createdBy_date', q =>
            q.eq('createdBy', userId).lt('updateDate', startOfDayMs(Date.now()) + TIME.DAY_MS)
        )
        .order('desc')
        .first();
    return countStreakFromIndexedDays(mostRecentUpdate?.updateDate, async dayStart => {
        const update = await ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_date', q =>
                q
                    .eq('createdBy', userId)
                    .gte('updateDate', dayStart)
                    .lt('updateDate', dayStart + TIME.DAY_MS)
            )
            .first();
        return update !== null;
    });
}
export async function calculateOrganizationStreak(
    ctx: ReadCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const mostRecentUpdate = await ctx.db
        .query('progressUpdates')
        .withIndex('by_organization_date', q =>
            q
                .eq('organizationId', organizationId)
                .lt('updateDate', startOfDayMs(Date.now()) + TIME.DAY_MS)
        )
        .order('desc')
        .first();
    return countStreakFromIndexedDays(mostRecentUpdate?.updateDate, async dayStart => {
        const update = await ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_date', q =>
                q
                    .eq('organizationId', organizationId)
                    .gte('updateDate', dayStart)
                    .lt('updateDate', dayStart + TIME.DAY_MS)
            )
            .first();
        return update !== null;
    });
}
