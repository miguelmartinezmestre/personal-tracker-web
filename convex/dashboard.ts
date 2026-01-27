import { queryWithRLS } from './rls';
import { v } from 'convex/values';
import { TIME, DASHBOARD } from './utils/constants';

export const getDashboardStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const totalObjectives = objectives.length;
        const completedObjectives = objectives.filter(o => o.status === 'completed').length;
        const pendingObjectives = objectives.filter(o => o.status === 'active').length;
        const pausedObjectives = objectives.filter(o => o.status === 'paused').length;
        const archivedObjectives = objectives.filter(o => o.status === 'archived').length;

        return {
            totalObjectives,
            completedObjectives,
            pendingObjectives,
            pausedObjectives,
            archivedObjectives,
        };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const monthsToFetch = 6;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const objectiveIds = new Set(objectives.map(o => String(o._id)));

        const allUpdates = await ctx.db.query('progressUpdates').collect();

        const userUpdates = allUpdates.filter(pu => objectiveIds.has(String(pu.objective)));

        const now = new Date();
        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = date.getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

            const count = userUpdates.filter(
                u => u.updateDate >= monthStart && u.updateDate < monthEnd
            ).length;

            const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            monthsData.push({
                month: capitalizedMonth,
                monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
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
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const limit = 5;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const objectivesWithProgress = objectives
            .filter(o => o.targetValue > 0 && o.status !== 'archived')
            .map(o => {
                const progress = Math.min(100, Math.round((o.currentValue / o.targetValue) * 100));
                return {
                    id: o._id,
                    objective: o.title,
                    progress,
                    status: o.status,
                };
            })
            .sort((a, b) => b.progress - a.progress)
            .slice(0, limit);

        return objectivesWithProgress;
    },
});

export const getUpcomingDeadlines = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const daysAhead = DASHBOARD.DEADLINE_DAYS_AHEAD;
        const now = Date.now();
        const futureLimit = now + daysAhead * TIME.DAY_MS;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const upcomingDeadlines = objectives
            .filter(o => {
                if (!o.deadline) return false;
                if (o.status === 'completed' || o.status === 'archived') return false;
                return o.deadline >= now && o.deadline <= futureLimit;
            })
            .map(o => {
                const daysRemaining = Math.ceil((o.deadline! - now) / TIME.DAY_MS);
                return {
                    id: o._id,
                    title: o.title,
                    deadline: o.deadline!,
                    daysRemaining,
                    progress: Math.min(100, Math.round((o.currentValue / o.targetValue) * 100)),
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
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const daysBack = DASHBOARD.ACTIVITY_DAYS_BACK;
        const startDate = Date.now() - daysBack * TIME.DAY_MS;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const objectiveIds = new Set(objectives.map(o => String(o._id)));

        const allUpdates = await ctx.db.query('progressUpdates').collect();
        const recentUpdates = allUpdates.filter(
            u => objectiveIds.has(String(u.objective)) && u.updateDate >= startDate
        );

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
