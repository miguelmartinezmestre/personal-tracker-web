'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

/**
 * Hook para obtener la sesión actual del usuario
 */
export function useSession() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getCurrentSession, {})
    );

    return {
        data: data ?? null,
        isPending: isPending,
        isLoading: isLoading,
    };
}
