'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { achievementProgressSchema, type AchievementProgress } from '@/schemas/achievement';

/**
 * Hook para obtener todas las definiciones de logros
 */
export function useAchievementDefinitions(type?: 'individual' | 'team') {
    return useQuery(convexQuery(api.achievements.getAchievementDefinitions, type ? { type } : {}));
}

/**
 * Hook para obtener los logros del usuario actual
 */
export function useUserAchievements() {
    return useQuery(convexQuery(api.achievements.getUserAchievements, {}));
}

/**
 * Hook para obtener los logros de un equipo
 */
export function useTeamAchievements(teamId: string | null) {
    return useQuery(
        convexQuery(api.achievements.getTeamAchievements, teamId ? { teamId } : 'skip')
    );
}

/**
 * Hook para obtener las estadísticas de logros del usuario
 */
export function useUserAchievementStats() {
    return useQuery(convexQuery(api.achievements.getUserAchievementStats, {}));
}

/**
 * Hook para obtener los logros recientes del usuario
 */
export function useRecentAchievements(limit: number = 5) {
    return useQuery(convexQuery(api.achievements.getRecentAchievements, { limit }));
}

/**
 * Hook para obtener el progreso hacia todos los logros
 */
export function useUserAchievementProgress() {
    return useQuery({
        ...convexQuery(api.achievements.getUserAchievementProgress, {}),
        select: (progress): AchievementProgress[] =>
            progress.map(item => achievementProgressSchema.parse(item)),
    });
}

/**
 * Hook para obtener el conteo de logros no vistos (para el sidebar)
 */
export function useUnviewedAchievementsCount() {
    return useQuery(convexQuery(api.achievements.getUnviewedAchievementsCount, {}));
}

/**
 * Hook para sembrar las definiciones de logros (solo admin)
 */
export function useSeedAchievements() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.achievements.seedAchievementDefinitions),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.achievements.getAchievementDefinitions, {}).queryKey,
            });
        },
    });
}
