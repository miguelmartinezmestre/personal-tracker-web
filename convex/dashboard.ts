import { queryWithRLS } from './rls';
import { v } from 'convex/values';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { computeProgressPercent } from './utils/objectiveProgress';

export const getDashboardStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const totalObjectives = objectives.length;
        const completedObjectives = objectives.filter(o => o.status === 'completed').length;
        const pendingObjectives = objectives.filter(o => o.status === 'active').length;

        return {
            totalObjectives,
            completedObjectives,
            pendingObjectives,
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

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        // Query progress updates per-objective using index (avoids full table scan)
        const userUpdates = (
            await Promise.all(
                objectives.map(o =>
                    ctx.db
                        .query('progressUpdates')
                        .withIndex('by_objective', q => q.eq('objective', o._id))
                        .collect()
                )
            )
        ).flat();

        const now = new Date();
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

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

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
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const upcomingDeadlines = objectives
            .filter(o => {
                if (!o.deadline) return false;
                if (o.status === 'completed') return false;
                return o.deadline >= now && o.deadline <= futureLimit;
            })
            .map(o => {
                const daysRemaining = Math.ceil((o.deadline! - now) / TIME.DAY_MS);
                return {
                    id: o._id,
                    title: o.title,
                    deadline: o.deadline!,
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

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        // Query progress updates per-objective using index (avoids full table scan)
        const recentUpdates = (
            await Promise.all(
                objectives.map(o =>
                    ctx.db
                        .query('progressUpdates')
                        .withIndex('by_objective_date', q =>
                            q.eq('objective', o._id).gte('updateDate', startDate)
                        )
                        .collect()
                )
            )
        ).flat();

        const recentObjectives = objectives.filter(o => o.createdAt >= startDate);

        const recentlyCompleted = objectives.filter(
            o => o.status === 'completed' && o.updatedAt >= startDate
        );

        return {
            progressUpdatesCount: recentUpdates.length,
            objectivesCreatedCount: recentObjectives.length,
            objectivesCompletedCount: recentlyCompleted.length,
            periodDays: daysBack,
        };
    },
});
