'use client';

import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from 'kitcn/auth/client';
import { authClient } from '@/features/auth/auth-client';
import { useRouter } from 'next/navigation';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { env } from '@/lib/env';

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

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

export function BetterConvexProvider({
    children,
    token,
}: {
    children: React.ReactNode;
    token: string;
}) {
    const { push } = useRouter();

    return (
        <QueryClientProvider client={queryClient}>
            <ConvexAuthProvider
                authClient={authClient}
                client={convex}
                initialToken={token}
                onMutationUnauthorized={() => {
                    push('/login');
                }}
                onQueryUnauthorized={() => {
                    push('/login');
                }}
            >
                {children}
            </ConvexAuthProvider>
        </QueryClientProvider>
    );
}
