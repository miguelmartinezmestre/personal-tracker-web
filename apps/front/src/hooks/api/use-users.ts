'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

/**
 * Hook para obtener el rol del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUserRole() {
    return useQuery(convexQuery(api.users.getUserRole, {}));
}
