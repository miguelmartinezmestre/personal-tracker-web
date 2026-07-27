import { queryWithRLS } from './platform/rls/wrappers';
import { v } from 'convex/values';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { assertBoundedInteger, assertValidReferenceTimestamp } from './utils/queryTime';
import { computeProgressPercent } from './domain/objectives/metrics';
import { objectiveStatusValidator } from './utils/validators';
import { currentUtcCivilDay, toUtcCivilDay } from '../shared/civil-date';

const LIST_LIMIT = 1000;

export const getDashboardStats = queryWithRLS({
    args: {},
    returns: v.object({
        totalObjectives: v.number(),
        completedObjectives: v.number(),
        pendingObjectives: v.number(),
        isTruncated: v.boolean(),
    }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return {
                totalObjectives: 0,
                completedObjectives: 0,
                pendingObjectives: 0,
                isTruncated: false,
            };
        }

        // Keep one query transaction bounded. Callers can explicitly signal the
        // approximation rather than failing after Convex's transaction read cap.
        let totalObjectives = 0;
        let completedObjectives = 0;
        let pendingObjectives = 0;
        const objectiveRows = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(LIST_LIMIT + 1);
        const isTruncated = objectiveRows.length > LIST_LIMIT;

        for (const objective of objectiveRows.slice(0, LIST_LIMIT)) {
            if (objective.deletedAt !== undefined) continue;
            totalObjectives += 1;
            if (objective.status === 'completed') {
                completedObjectives += 1;
            } else {
                pendingObjectives += 1;
            }
        }

        return { totalObjectives, completedObjectives, pendingObjectives, isTruncated };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
        now: v.number(),
    },
    returns: v.object({
        items: v.array(v.object({ month: v.string(), monthKey: v.string(), count: v.number() })),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const userId = ctx.userId;
        const monthsToFetch = assertBoundedInteger(args.months ?? DASHBOARD.MONTHS_TO_SHOW, {
            min: DASHBOARD.MIN_MONTHS,
            max: DASHBOARD.MAX_MONTHS,
        });

        // The client timestamp exists only to refresh this reactive query. Use
        // the trusted server clock for all date windows.
        const referenceDate = new Date(Date.now());
        const referenceYear = referenceDate.getUTCFullYear();
        const referenceMonth = referenceDate.getUTCMonth();
        const startDate = Date.UTC(referenceYear, referenceMonth - (monthsToFetch - 1), 1);

        const userUpdatesRaw = await ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_organization_date', q =>
                q
                    .eq('createdBy', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .order('desc')
            .take(LIST_LIMIT + 1);
        const isTruncated = userUpdatesRaw.length > LIST_LIMIT;
        const userUpdates = userUpdatesRaw.slice(0, LIST_LIMIT);

        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const monthStart = Date.UTC(referenceYear, referenceMonth - i, 1);
            const monthEnd = Date.UTC(referenceYear, referenceMonth - i + 1, 1);
            const date = new Date(monthStart);

            const count = userUpdates.filter(
                update => update.updateDate >= monthStart && update.updateDate < monthEnd
            ).length;

            const monthKey = `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}`;

            monthsData.push({
                month: monthKey,
                monthKey,
                count,
            });
        }

        return { items: monthsData, isTruncated };
    },
});

export const getObjectivesWithMostProgress = queryWithRLS({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.object({
        items: v.array(
            v.object({
                id: v.id('objectives'),
                objective: v.string(),
                progress: v.number(),
                status: objectiveStatusValidator,
            })
        ),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const MAX_QUERY_LIMIT = 100;
        const maxItems = assertBoundedInteger(args.limit ?? PAGINATION.DASHBOARD_LIMIT, {
            min: 1,
            max: MAX_QUERY_LIMIT,
        });

        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const objectiveRows = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(LIST_LIMIT + 1);
        const isTruncated = objectiveRows.length > LIST_LIMIT;
        const objectives = objectiveRows
            .slice(0, LIST_LIMIT)
            .filter(objective => objective.deletedAt === undefined);

        const objectivesWithProgress = objectives
            .filter(objective => objective.status === 'active')
            .map(objective => {
                const progress = computeProgressPercent({
                    currentValue: objective.currentValue,
                    targetValue: objective.targetValue,
                    startValue: objective.startValue,
                });
                return {
                    id: objective._id,
                    objective: objective.title,
                    progress,
                    status: objective.status,
                };
            })
            .sort((a, b) => b.progress - a.progress)
            .slice(0, maxItems);

        return { items: objectivesWithProgress, isTruncated };
    },
});

export const getUpcomingDeadlines = queryWithRLS({
    args: {
        days: v.optional(v.number()),
        now: v.number(),
    },
    returns: v.object({
        items: v.array(
            v.object({
                id: v.id('objectives'),
                title: v.string(),
                deadline: v.number(),
                daysRemaining: v.number(),
                progress: v.number(),
            })
        ),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const organizationId = ctx.organizationId;
        const daysAhead = assertBoundedInteger(args.days ?? DASHBOARD.DEADLINE_DAYS_AHEAD, {
            min: DASHBOARD.MIN_DAYS,
            max: DASHBOARD.MAX_DEADLINE_DAYS,
        });
        const today = currentUtcCivilDay();
        const futureLimit = today + daysAhead * TIME.DAY_MS;

        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const objectiveRows = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .gte('deadline', today)
                    .lt('deadline', futureLimit)
            )
            .take(LIST_LIMIT + 1);
        const isTruncated = objectiveRows.length > LIST_LIMIT;
        const objectives = objectiveRows
            .slice(0, LIST_LIMIT)
            .filter(objective => objective.deletedAt === undefined);

        const upcomingDeadlines = objectives
            .filter(
                (objective): objective is typeof objective & { deadline: number } =>
                    objective.status === 'active' && Boolean(objective.deadline)
            )
            .map(objective => {
                const deadline = toUtcCivilDay(objective.deadline);
                const daysRemaining = Math.round((deadline - today) / TIME.DAY_MS);
                return {
                    id: objective._id,
                    title: objective.title,
                    deadline,
                    daysRemaining,
                    progress: computeProgressPercent({
                        currentValue: objective.currentValue,
                        targetValue: objective.targetValue,
                        startValue: objective.startValue,
                    }),
                };
            })
            .sort((a, b) => a.deadline - b.deadline);

        return { items: upcomingDeadlines, isTruncated };
    },
});

export const getRecentActivity = queryWithRLS({
    args: {
        days: v.optional(v.number()),
        now: v.number(),
    },
    returns: v.object({
        progressUpdatesCount: v.number(),
        objectivesCreatedCount: v.number(),
        objectivesCompletedCount: v.number(),
        periodDays: v.number(),
        progressUpdatesTruncated: v.boolean(),
        objectivesCreatedTruncated: v.boolean(),
        objectivesCompletedTruncated: v.boolean(),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;
        const daysBack = assertBoundedInteger(args.days ?? DASHBOARD.ACTIVITY_DAYS_BACK, {
            min: DASHBOARD.MIN_DAYS,
            max: DASHBOARD.MAX_ACTIVITY_DAYS,
        });
        const startDate = Date.now() - daysBack * TIME.DAY_MS;

        if (!organizationId) {
            return {
                progressUpdatesCount: 0,
                objectivesCreatedCount: 0,
                objectivesCompletedCount: 0,
                periodDays: daysBack,
                progressUpdatesTruncated: false,
                objectivesCreatedTruncated: false,
                objectivesCompletedTruncated: false,
                isTruncated: false,
            };
        }

        const recentCreatedPromise = ctx.db
            .query('objectives')
            .withIndex('by_organization_createdAt', q =>
                q.eq('organizationId', organizationId).gte('createdAt', startDate)
            )
            .order('desc')
            .take(LIST_LIMIT + 1);

        const recentCompletedPromise = ctx.db
            .query('objectives')
            .withIndex('by_organization_completedAt', q =>
                q.eq('organizationId', organizationId).gte('completedAt', startDate)
            )
            .order('desc')
            .take(LIST_LIMIT + 1);

        const recentUpdatesPromise = ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_organization_date', q =>
                q
                    .eq('createdBy', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .take(101);

        const [recentCreatedRows, recentCompletedRows, recentUpdateRows] = await Promise.all([
            recentCreatedPromise,
            recentCompletedPromise,
            recentUpdatesPromise,
        ]);
        const objectivesCreatedTruncated = recentCreatedRows.length > LIST_LIMIT;
        const objectivesCompletedTruncated = recentCompletedRows.length > LIST_LIMIT;
        const progressUpdatesTruncated = recentUpdateRows.length > 100;
        const isTruncated =
            objectivesCreatedTruncated || objectivesCompletedTruncated || progressUpdatesTruncated;
        const recentUpdates = recentUpdateRows.slice(0, 100);

        const recentObjectives = recentCreatedRows
            .slice(0, LIST_LIMIT)
            .filter(objective => objective.deletedAt === undefined);
        const recentlyCompleted = recentCompletedRows
            .slice(0, LIST_LIMIT)
            .filter(
                objective =>
                    objective.deletedAt === undefined &&
                    objective.status === 'completed' &&
                    objective.completedAt !== undefined
            );

        return {
            progressUpdatesCount: recentUpdates.length,
            objectivesCreatedCount: recentObjectives.length,
            objectivesCompletedCount: recentlyCompleted.length,
            periodDays: daysBack,
            progressUpdatesTruncated,
            objectivesCreatedTruncated,
            objectivesCompletedTruncated,
            isTruncated,
        };
    },
});
