'use client';

import { ConvexQueryClient } from '@convex-dev/react-query';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { toast } from 'sonner';
import { env } from '@/lib/env';

export const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

const convexQueryClient = new ConvexQueryClient(convex);

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
        },
    },
    mutationCache: new MutationCache({
        onError: error => {
            toast(error.message, { className: 'bg-red-500 text-white' });
        },
    }),
});

convexQueryClient.connect(queryClient);
