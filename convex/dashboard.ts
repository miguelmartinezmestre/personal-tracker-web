import { queryWithRLS } from './rls';
import { v } from 'convex/values';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { computeProgressPercent } from './utils/objectiveProgress';

const LIST_LIMIT = 1000;

export const getDashboardStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        return {
            totalObjectives: objectives.length,
            completedObjectives: objectives.filter(o => o.status === 'completed').length,
            pendingObjectives: objectives.filter(o => o.status === 'active').length,
        };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const monthsToFetch = args.months ?? DASHBOARD.MONTHS_TO_SHOW;

        const now = new Date();
        const oldestDate = new Date(now.getFullYear(), now.getMonth() - (monthsToFetch - 1), 1);
        const startDate = oldestDate.getTime();

        const userUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_user_date', q => q.eq('userId', userId).gte('updateDate', startDate))
            .take(LIST_LIMIT);

        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = date.getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

            const count = userUpdates.filter(
                u => u.updateDate >= monthStart && u.updateDate < monthEnd
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
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const maxItems = args.limit ?? PAGINATION.DASHBOARD_LIMIT;
        const fetchLimit = maxItems * 3;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active'))
            .take(fetchLimit);

        const objectivesWithProgress = objectives
            .map(o => {
                const progress = computeProgressPercent({
                    currentValue: o.currentValue,
                    targetValue: o.targetValue,
                    startValue: o.startValue,
                });
                return {
                    id: o._id,
                    objective: o.title,
                    progress,
                    status: o.status,
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
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const daysAhead = args.days ?? DASHBOARD.DEADLINE_DAYS_AHEAD;
        const now = Date.now();
        const futureLimit = now + daysAhead * TIME.DAY_MS;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user_status_deadline', q =>
                q
                    .eq('userId', userId)
                    .eq('status', 'active')
                    .gt('deadline', now - 1)
                    .lt('deadline', futureLimit + 1)
            )
            .take(50);

        const upcomingDeadlines = objectives
            .filter((o): o is typeof o & { deadline: number } => Boolean(o.deadline))
            .map(o => {
                const daysRemaining = Math.ceil((o.deadline - now) / TIME.DAY_MS);
                return {
                    id: o._id,
                    title: o.title,
                    deadline: o.deadline,
                    daysRemaining,
                    progress: computeProgressPercent({
                        currentValue: o.currentValue,
                        targetValue: o.targetValue,
                        startValue: o.startValue,
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
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const daysBack = args.days ?? DASHBOARD.ACTIVITY_DAYS_BACK;
        const startDate = Date.now() - daysBack * TIME.DAY_MS;

        const recentObjectivesPromise = ctx.db
            .query('objectives')
            .withIndex('by_user_createdAt', q => q.eq('userId', userId).gte('createdAt', startDate))
            .take(100);

        const recentlyCompletedPromise = ctx.db
            .query('objectives')
            .withIndex('by_user_status_updatedAt', q =>
                q.eq('userId', userId).eq('status', 'completed').gte('updatedAt', startDate)
            )
            .take(100);

        const recentUpdatesPromise = ctx.db
            .query('progressUpdates')
            .withIndex('by_user_date', q => q.eq('userId', userId).gte('updateDate', startDate))
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
