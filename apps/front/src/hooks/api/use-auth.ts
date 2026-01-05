'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener el usuario actual autenticado
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 * @param skip - Si es true, no se ejecutará la query
 */
export function useCurrentUser(skip?: boolean) {
    const query = useQuery(convexQuery(api.auth.getCurrentUser, skip ? 'skip' : {}));
    return query.data;
}

/**
 * Hook para verificar si el usuario está autenticado
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useIsAuthenticated() {
    const query = useQuery(convexQuery(api.auth.isAuthenticated, {}));
    return query.data ?? false;
}
