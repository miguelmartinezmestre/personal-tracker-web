'use client';

import { ConvexQueryClient } from '@convex-dev/react-query';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { toast } from 'sonner';
import { env } from '@/lib/env';
import { getErrorLocale, resolveErrorMessage } from '@/lib/error-messages';

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
        onError: (error, _variables, _context, mutation) => {
            if (mutation.options.onError || mutation.meta?.handlesErrorsLocally === true) {
                return;
            }

            toast(resolveErrorMessage(error, getErrorLocale()), {
                className: 'bg-red-500 text-white',
            });
        },
    }),
});

convexQueryClient.connect(queryClient);
