import type { Doc, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { DAY_MS, startOfUtcDay } from '../objectives/rules';
import { metricCap, type AchievementMetric } from './definitions';

type Db = QueryCtx['db'];

// Completed by the end of its deadline day, in UTC like every civil date.
export function isEarlyBirdCompletion(objective: Doc<'objectives'>): boolean {
    return (
        objective.completedAt !== undefined &&
        objective.deadline !== undefined &&
        objective.completedAt < objective.deadline + DAY_MS
    );
}

// Consecutive UTC days with progress, ending today or, while today has none yet, yesterday.
async function countStreak(hasProgressOn: (day: number) => Promise<boolean>, cap: number) {
    const today = startOfUtcDay(Date.now());
    let day = (await hasProgressOn(today)) ? today : today - DAY_MS;
    let streak = 0;

    while (streak < cap && (await hasProgressOn(day))) {
        streak++;
        day -= DAY_MS;
    }

    return streak;
}

// Individual metrics span all the user's organizations; trashed objectives never count.
export async function achievementMetrics(
    db: Db,
    userId: Id<'user'>,
    organizationId: Id<'organization'>,
    isEarlyBird: boolean
): Promise<Record<AchievementMetric, number>> {
    const [created, completed, updates, organizationCreated, organizationCompleted] =
        await Promise.all([
            db
                .query('objectives')
                .withIndex('by_creator_deletedAt_status', q =>
                    q.eq('createdBy', userId).eq('deletedAt', undefined)
                )
                .take(metricCap('objectivesCreated')),
            db
                .query('objectives')
                .withIndex('by_creator_deletedAt_status', q =>
                    q.eq('createdBy', userId).eq('deletedAt', undefined).eq('status', 'completed')
                )
                .take(metricCap('objectivesCompleted')),
            db
                .query('progressUpdates')
                .withIndex('by_createdBy_date', q => q.eq('createdBy', userId))
                .take(metricCap('progressUpdates')),
            db
                .query('objectives')
                .withIndex('by_organization_deletedAt_createdAt', q =>
                    q.eq('organizationId', organizationId).eq('deletedAt', undefined)
                )
                .take(metricCap('organizationObjectivesCreated')),
            db
                .query('objectives')
                .withIndex('by_organization_deletedAt_status_createdAt', q =>
                    q
                        .eq('organizationId', organizationId)
                        .eq('deletedAt', undefined)
                        .eq('status', 'completed')
                )
                .take(metricCap('organizationObjectivesCompleted')),
        ]);

    const progressStreak = await countStreak(
        async day =>
            (await db
                .query('progressUpdates')
                .withIndex('by_createdBy_date', q =>
                    q.eq('createdBy', userId).eq('updateDate', day)
                )
                .first()) !== null,
        metricCap('progressStreak')
    );

    const organizationProgressStreak = await countStreak(
        async day =>
            (await db
                .query('progressUpdates')
                .withIndex('by_organization_date', q =>
                    q.eq('organizationId', organizationId).eq('updateDate', day)
                )
                .first()) !== null,
        metricCap('organizationProgressStreak')
    );

    return {
        objectivesCreated: created.length,
        objectivesCompleted: completed.length,
        earlyBirdCompletions: isEarlyBird ? 1 : 0,
        progressUpdates: updates.length,
        progressStreak,
        organizationObjectivesCreated: organizationCreated.length,
        organizationObjectivesCompleted: organizationCompleted.length,
        organizationProgressStreak,
    };
}
