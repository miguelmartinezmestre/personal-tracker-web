'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
    const data = useQuery(api.organizations.getActiveOrganization, {});

    return {
        data: data ?? null,
        isPending: data === undefined,
        isLoading: data === undefined,
    };
}

/**
 * Hook para obtener el miembro activo (relación usuario-organización activa)
 */
export function useActiveMember() {
    const data = useQuery(api.organizations.getActiveMember, {});

    return {
        data: data ?? null,
        isPending: data === undefined,
        isLoading: data === undefined,
    };
}
