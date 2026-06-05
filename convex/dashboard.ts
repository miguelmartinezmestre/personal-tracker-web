import { queryWithRLS } from './platform/rls/wrappers';
import { v } from 'convex/values';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { computeProgressPercent } from './domain/objectives/metrics';
import { objectiveStatusValidator } from './utils/validators';

const LIST_LIMIT = 1000;

export const getDashboardStats = queryWithRLS({
    args: {},
    returns: v.object({
        totalObjectives: v.number(),
        completedObjectives: v.number(),
        pendingObjectives: v.number(),
    }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { totalObjectives: 0, completedObjectives: 0, pendingObjectives: 0 };
        }

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(LIST_LIMIT);

        return {
            totalObjectives: objectives.length,
            completedObjectives: objectives.filter(objective => objective.status === 'completed')
                .length,
            pendingObjectives: objectives.filter(objective => objective.status === 'active').length,
        };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
    },
    returns: v.array(v.object({ month: v.string(), monthKey: v.string(), count: v.number() })),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return [];
        }

        const userId = ctx.userId;
        const monthsToFetch = args.months ?? DASHBOARD.MONTHS_TO_SHOW;

        const now = new Date();
        const oldestDate = new Date(now.getFullYear(), now.getMonth() - (monthsToFetch - 1), 1);
        const startDate = oldestDate.getTime();

        const userUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_user_organization_date', q =>
                q
                    .eq('userId', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .take(LIST_LIMIT);

        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = date.getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

            const count = userUpdates.filter(
                update => update.updateDate >= monthStart && update.updateDate < monthEnd
            ).length;

            const monthKey = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;

            monthsData.push({
                month: monthKey,
                monthKey,
                count,
            });
        }

        return monthsData;
    },
});

export const getObjectivesWithMostProgress = queryWithRLS({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            id: v.id('objectives'),
            objective: v.string(),
            progress: v.number(),
            status: objectiveStatusValidator,
        })
    ),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const MAX_QUERY_LIMIT = 100;
        const maxItems = Math.min(args.limit ?? PAGINATION.DASHBOARD_LIMIT, MAX_QUERY_LIMIT);
        const fetchLimit = Math.min(maxItems * 3, MAX_QUERY_LIMIT);

        if (!organizationId) {
            return [];
        }

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .filter(q => q.eq(q.field('status'), 'active'))
            .take(fetchLimit);

        const objectivesWithProgress = objectives
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

        return objectivesWithProgress;
    },
});

export const getUpcomingDeadlines = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            id: v.id('objectives'),
            title: v.string(),
            deadline: v.number(),
            daysRemaining: v.number(),
            progress: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const daysAhead = args.days ?? DASHBOARD.DEADLINE_DAYS_AHEAD;
        const now = Date.now();
        const futureLimit = now + daysAhead * TIME.DAY_MS;

        if (!organizationId) {
            return [];
        }

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .gt('deadline', now - 1)
                    .lt('deadline', futureLimit + 1)
            )
            .filter(q => q.eq(q.field('status'), 'active'))
            .take(50);

        const upcomingDeadlines = objectives
            .filter((objective): objective is typeof objective & { deadline: number } =>
                Boolean(objective.deadline)
            )
            .map(objective => {
                const daysRemaining = Math.ceil((objective.deadline - now) / TIME.DAY_MS);
                return {
                    id: objective._id,
                    title: objective.title,
                    deadline: objective.deadline,
                    daysRemaining,
                    progress: computeProgressPercent({
                        currentValue: objective.currentValue,
                        targetValue: objective.targetValue,
                        startValue: objective.startValue,
                    }),
                };
            })
            .sort((a, b) => a.deadline - b.deadline);

        return upcomingDeadlines;
    },
});

export const getRecentActivity = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.object({
        progressUpdatesCount: v.number(),
        objectivesCreatedCount: v.number(),
        objectivesCompletedCount: v.number(),
        periodDays: v.number(),
    }),
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;
        const daysBack = args.days ?? DASHBOARD.ACTIVITY_DAYS_BACK;
        const startDate = Date.now() - daysBack * TIME.DAY_MS;

        if (!organizationId) {
            return {
                progressUpdatesCount: 0,
                objectivesCreatedCount: 0,
                objectivesCompletedCount: 0,
                periodDays: daysBack,
            };
        }

        const recentObjectivesPromise = ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .filter(q => q.gte(q.field('createdAt'), startDate))
            .take(100);

        const recentlyCompletedPromise = ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .filter(q =>
                q.and(q.eq(q.field('status'), 'completed'), q.gte(q.field('updatedAt'), startDate))
            )
            .take(100);

        const recentUpdatesPromise = ctx.db
            .query('progressUpdates')
            .withIndex('by_user_organization_date', q =>
                q
                    .eq('userId', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .take(100);

        const [recentObjectives, recentlyCompleted, recentUpdates] = await Promise.all([
            recentObjectivesPromise,
            recentlyCompletedPromise,
            recentUpdatesPromise,
        ]);

        return {
            progressUpdatesCount: recentUpdates.length,
            objectivesCreatedCount: recentObjectives.length,
            objectivesCompletedCount: recentlyCompleted.length,
            periodDays: daysBack,
        };
    },
});
