'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

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
