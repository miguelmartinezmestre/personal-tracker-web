import type { DatabaseReader } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';
import { TIME, ERROR_CODES } from '../../utils/constants';
import { ConvexError } from 'convex/values';

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
    objectiveIds: Id<'objectives'>[],
    organizationId: Id<'organization'>,
    userId?: Id<'user'>
): Promise<Doc<'progressUpdates'>[]> {
    for (const objectiveId of objectiveIds) {
        const objective = await ctx.db.get('objectives', objectiveId);
        if (!objective) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
        }
        if (objective.organizationId !== organizationId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
    }

    if (objectiveIds.length === 0) return [];

    if (userId) {
        const results = await Promise.all(
            objectiveIds.map(async objectiveId => {
                return await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
                    .filter(q => q.eq(q.field('userId'), userId))
                    .collect();
            })
        );
        return results.flat();
    }

    const results = await Promise.all(
        objectiveIds.map(async objectiveId => {
            return await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
                .collect();
        })
    );
    return results.flat();
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

    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user_organization', q =>
            q.eq('userId', userId).eq('organizationId', organizationId)
        )
        .collect();

    const objectiveIds = objectives.map((objective: Doc<'objectives'>) => objective._id);

    if (objectiveIds.length === 0) return 0;

    const userUpdates = await fetchProgressUpdates(ctx, objectiveIds, organizationId, userId);

    return countStreakFromUpdates(userUpdates);
}

export async function calculateOrganizationStreak(
    ctx: ReadCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const organizationObjectives = await ctx.db
        .query('objectives')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .collect();

    const objectiveIds = organizationObjectives.map(
        (objective: Doc<'objectives'>) => objective._id
    );

    if (objectiveIds.length === 0) return 0;

    const organizationUpdates = await fetchProgressUpdates(ctx, objectiveIds, organizationId);

    return countStreakFromUpdates(organizationUpdates);
}
