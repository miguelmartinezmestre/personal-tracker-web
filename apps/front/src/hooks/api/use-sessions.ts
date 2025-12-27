'use client';

import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

/**
 * Hook para obtener todas las sesiones del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useSessions() {
    return useSuspenseQuery(convexQuery(api.sessions.getSessionsByUser, {}));
}

/**
 * Hook para invalidar una sesión
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useInvalidateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.sessions.invalidateSession),
        onSuccess: () => {
            // Invalidar la query de sesiones para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.sessions.getSessionsByUser, {}).queryKey,
            });
        },
    });
}

