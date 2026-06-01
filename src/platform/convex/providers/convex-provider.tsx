'use client';

import { ConvexAuthProvider } from 'kitcn/auth/client';
import { authClient } from '@/features/auth/client';
import { useRouter } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { convex, queryClient } from './convex-query-client';
import { useConvexAuth } from 'convex/react';
import { Loader2 } from 'lucide-react';

function AuthShield({ children }: { children: React.ReactNode }) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <div>Unauthorized</div>;
    }

    return children;
}

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
                <AuthShield>{children}</AuthShield>
            </ConvexAuthProvider>
        </QueryClientProvider>
    );
}
