'use client';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

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

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </ConvexBetterAuthProvider>
    );
}
