'use client';

import { useQuery } from 'convex/react';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener el usuario actual autenticado
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 * @param skip - Si es true, no se ejecutará la query
 */
export function useCurrentUser(skip?: boolean) {
    return useQuery(api.auth.getCurrentUser, skip ? 'skip' : {});
}

/**
 * Hook para verificar si el usuario está autenticado
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useIsAuthenticated() {
    return useReactQuery(convexQuery(api.auth.isAuthenticated, {}));
}

