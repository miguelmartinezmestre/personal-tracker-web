'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

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
