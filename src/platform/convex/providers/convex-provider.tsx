'use client';

import { ConvexAuthProvider } from 'kitcn/auth/client';
import { authClient } from '@/features/auth/client';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { convex, queryClient } from './convex-query-client';
import { useConvexAuth } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const publicRoutePrefixes = [
    '/',
    '/login',
    '/register',
    '/forget-password',
    '/reset-password',
    '/setup',
    '/invitations',
];

function isPublicRoute(pathname: string | null): boolean {
    if (!pathname) return false;
    if (pathname === '/') return true;
    return publicRoutePrefixes.some(prefix => prefix !== '/' && pathname.startsWith(prefix));
}

function AuthShield({ children }: { children: React.ReactNode }) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || isAuthenticated || isPublicRoute(pathname)) {
            return;
        }

        const redirectTimer = window.setTimeout(() => {
            router.replace('/login');
        }, 750);

        return () => {
            window.clearTimeout(redirectTimer);
        };
    }, [authLoading, isAuthenticated, pathname, router]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated && !isPublicRoute(pathname)) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
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
