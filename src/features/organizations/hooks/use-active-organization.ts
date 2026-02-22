'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

export interface ActiveOrganization {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: string | null;
    createdAt: number;
}

export interface ActiveMember {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: number;
}

/**
 * Hook para obtener la organización activa del usuario
 */
export function useActiveOrganization() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getActiveOrganization, {})
    );

    return {
        data: data ?? null,
        isPending: isPending,
        isLoading: isLoading,
    };
}

/**
 * Hook para obtener el miembro activo (relación usuario-organización activa)
 */
export function useActiveMember() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getActiveMember, {})
    );

    return {
        data: data ?? null,
        isPending: isPending,
        isLoading: isLoading,
    };
}
