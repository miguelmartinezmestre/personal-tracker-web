'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener estadísticas generales del dashboard
 */
export function useDashboardStats() {
    return useQuery(convexQuery(api.dashboard.getDashboardStats, {}));
}

/**
 * Hook para obtener el progreso mensual (actualizaciones por mes)
 */
export function useMonthlyProgress() {
    return useQuery(convexQuery(api.dashboard.getMonthlyProgress, {}));
}

/**
 * Hook para obtener los objetivos con mayor progreso
 */
export function useObjectivesWithMostProgress() {
    return useQuery(convexQuery(api.dashboard.getObjectivesWithMostProgress, {}));
}

/**
 * Hook para obtener los deadlines próximos
 */
export function useUpcomingDeadlines() {
    return useQuery(convexQuery(api.dashboard.getUpcomingDeadlines, {}));
}

/**
 * Hook para obtener estadísticas de actividad reciente
 */
export function useRecentActivity() {
    return useQuery(convexQuery(api.dashboard.getRecentActivity, {}));
}
