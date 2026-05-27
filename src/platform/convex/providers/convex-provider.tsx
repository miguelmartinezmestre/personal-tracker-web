'use client';

import { ConvexAuthProvider } from 'kitcn/auth/client';
import { authClient } from '@/features/auth/client';
import { useRouter } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { convex, queryClient } from './convex-query-client';

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
