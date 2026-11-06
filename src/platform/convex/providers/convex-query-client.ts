'use client';

import { ConvexQueryClient } from '@convex-dev/react-query';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { toast } from 'sonner';
import { extractErrorCode, getErrorLocale, resolveErrorMessage } from '@/lib/error-messages';
import { NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';

export const convex = new ConvexReactClient(NEXT_PUBLIC_CONVEX_URL);

const convexQueryClient = new ConvexQueryClient(convex);

// A revoked session keeps a valid JWT until it expires, but the backend rejects it right away
// with AUTH_REQUIRED; the provider registers what to do then (go to the login page).
let onAuthRequired: (() => void) | null = null;

export function setAuthRequiredHandler(handler: (() => void) | null) {
    onAuthRequired = handler;
}

function handleAuthRequired(error: unknown) {
    if (extractErrorCode(error) !== 'AUTH_REQUIRED') {
        return false;
    }

    onAuthRequired?.();

    return true;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
        },
    },
    queryCache: new QueryCache({
        onError: error => {
            handleAuthRequired(error);
        },
    }),
    mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
            if (handleAuthRequired(error)) {
                return;
            }

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
