'use client';

import { ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { authClient } from '@/features/auth/auth-client';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { toast } from 'sonner';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
