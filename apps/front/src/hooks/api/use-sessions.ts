'use client';

import { useMutation, useSuspenseQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { usePaginationState } from '@/hooks/use-pagination';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook para obtener todas las sesiones del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useSessions() {
    return useSuspenseQuery(convexQuery(api.sessions.getSessionsByUser, {
        paginationOpts: {
            numItems: DEFAULT_PAGE_SIZE,
            cursor: null,
        },
    }));
}

/**
 * Hook para obtener sesiones paginadas del usuario actual
 */
export function useSessionsPaginated(totalItems?: number) {
    const { currentPage, totalPages, nextPage, previousPage, goToPage, resetPage } = usePaginationState(totalItems, DEFAULT_PAGE_SIZE);

    const query = useQuery({
        ...convexQuery(api.sessions.getSessionsByUser, {
            paginationOpts: {
                numItems: DEFAULT_PAGE_SIZE,
                cursor: currentPage === 0 ? null : currentPage.toString(),
            },
        }),
    });

    return {
        ...query,
        currentPage,
        totalPages,
        nextPage,
        previousPage,
        goToPage,
        resetPage,
    };
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
                queryKey: convexQuery(api.sessions.getSessionsByUser, {
                    paginationOpts: {
                        numItems: DEFAULT_PAGE_SIZE,
                        cursor: null,
                    },
                }).queryKey,
            });
        },
    });
}
