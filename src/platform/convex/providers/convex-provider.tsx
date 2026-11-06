'use client';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from '@/features/auth/client';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { convex, queryClient, setAuthRequiredHandler } from './convex-query-client';
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
    if (!pathname) {
        return false;
    }

    if (pathname === '/') {
        return true;
    }

    return publicRoutePrefixes.some(prefix => prefix !== '/' && pathname.startsWith(prefix));
}

function AuthShield({ children }: { children: React.ReactNode }) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const pathname = usePathname();
    const router = useRouter();
    const isPublic = isPublicRoute(pathname);

    useEffect(() => {
        if (authLoading || isAuthenticated || isPublic) {
            return;
        }

        const redirectTimer = window.setTimeout(() => {
            router.replace('/login');
        }, 750);

        return () => {
            window.clearTimeout(redirectTimer);
        };
    }, [authLoading, isAuthenticated, isPublic, router]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            queryClient.clear();
        }
    }, [authLoading, isAuthenticated]);

    if (!isPublic && authLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated && !isPublic) {
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
    const router = useRouter();

    useEffect(() => {
        setAuthRequiredHandler(() => {
            router.push('/login');
        });

        return () => {
            setAuthRequiredHandler(null);
        };
    }, [router]);

    return (
        <QueryClientProvider client={queryClient}>
            <ConvexBetterAuthProvider
                authClient={authClient}
                client={convex}
                initialToken={token || null}
            >
                <AuthShield>{children}</AuthShield>
            </ConvexBetterAuthProvider>
        </QueryClientProvider>
    );
}
