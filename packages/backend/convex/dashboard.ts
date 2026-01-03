import { queryWithRLS } from './rls';
import { v } from 'convex/values';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Obtiene estadísticas generales del dashboard del usuario
 */
export const getDashboardStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const totalObjectives = objectives.length;
        const completedObjectives = objectives.filter(o => o.status === 'completed').length;
        const pendingObjectives = objectives.filter(
            o => o.status === 'in_progress' || o.status === 'active'
        ).length;
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

/**
 * Obtiene el conteo de actualizaciones de progreso por mes (últimos 6 meses)
 */
export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const monthsToFetch = 6;

        // Obtener los objetivos del usuario
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const objectiveIds = new Set(objectives.map(o => String(o._id)));

        // Obtener todas las actualizaciones de progreso
        const allUpdates = await ctx.db.query('progressUpdates').collect();

        // Filtrar solo las actualizaciones de los objetivos del usuario
        const userUpdates = allUpdates.filter(pu => objectiveIds.has(String(pu.objective)));

        // Calcular el rango de fechas (últimos N meses)
        const now = new Date();
        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = date.getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

            const count = userUpdates.filter(
                u => u.updateDate >= monthStart && u.updateDate < monthEnd
            ).length;

            // Formato: "Ene", "Feb", etc.
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

/**
 * Obtiene los objetivos con mayor progreso
 */
export const getObjectivesWithMostProgress = queryWithRLS({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const limit = 5;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        // Calcular porcentaje de progreso para cada objetivo
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

/**
 * Obtiene los objetivos con deadlines próximos
 */
export const getUpcomingDeadlines = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const daysAhead = 7;
        const now = Date.now();
        const futureLimit = now + daysAhead * DAY_MS;

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const upcomingDeadlines = objectives
            .filter(o => {
                if (!o.deadline) return false;
                if (o.status === 'completed' || o.status === 'archived') return false;
                return o.deadline >= now && o.deadline <= futureLimit;
            })
            .map(o => {
                const daysRemaining = Math.ceil((o.deadline! - now) / DAY_MS);
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

/**
 * Obtiene estadísticas de actividad reciente
 */
export const getRecentActivity = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const daysBack = 30;
        const startDate = Date.now() - daysBack * DAY_MS;

        // Objetivos del usuario
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const objectiveIds = new Set(objectives.map(o => String(o._id)));

        // Actualizaciones de progreso recientes
        const allUpdates = await ctx.db.query('progressUpdates').collect();
        const recentUpdates = allUpdates.filter(
            u => objectiveIds.has(String(u.objective)) && u.updateDate >= startDate
        );

        // Objetivos creados recientemente
        const recentObjectives = objectives.filter(o => o.createdAt >= startDate);

        // Objetivos completados recientemente
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
