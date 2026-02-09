'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
}

export interface Session {
    id: string;
    userId: string;
    expiresAt: number;
    activeOrganizationId?: string | null;
    createdAt: number;
}

export interface SessionData {
    session: Session;
    user: SessionUser | null;
}

/**
 * Hook para obtener la sesión actual del usuario
 */
export function useSession() {
    const data = useQuery(api.organizations.getCurrentSession, {});

    return {
        data: data ?? null,
        isPending: data === undefined,
        isLoading: data === undefined,
    };
}
