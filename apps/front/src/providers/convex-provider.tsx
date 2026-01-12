'use client';

import { ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { authClient } from '@/lib/auth-client';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { toast } from 'sonner';
import { api } from '@repo/backend/convex/_generated/api';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Expose Convex client and API for E2E tests
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.__CONVEX_CLIENT__ = convex;
    win.__CONVEX_API__ = api;
}

const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
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

export function ConvexClientProvider({
    children,
    initialToken,
}: {
    children: ReactNode;
    initialToken?: string | null;
}) {
    return (
        <QueryClientProvider client={queryClient}>
            <ConvexBetterAuthProvider
                client={convex}
                authClient={authClient}
                initialToken={initialToken}
            >
                {children}
            </ConvexBetterAuthProvider>
        </QueryClientProvider>
    );
}
