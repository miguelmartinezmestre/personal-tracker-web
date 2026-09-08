'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';

export function useSession() {
    return useQuery(convexQuery(api.organizations.getCurrentSession, {}));
}
