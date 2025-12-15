'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import { UserProvider } from '@/contexts/user-context';

export default function AuthenticatedView({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // `better-auth` exposes a `useSession()` hook via the client.
    // Its return shape may differ slightly by version, so we read the common fields.
    const sessionQuery = authClient.useSession() as any;
    const session = sessionQuery?.data;
    const isSessionLoading = Boolean(sessionQuery?.isPending ?? sessionQuery?.isLoading);

    // Only query Convex for the current user once we have a session.
    const user = useQuery(api.auth.getCurrentUser, session?.user ? {} : ('skip' as any));

    useEffect(() => {
        if (isSessionLoading) return;
        if (!session?.user) {
            router.replace('/login');
        }
    }, [isSessionLoading, session, router]);

    const fallbackUser = useMemo(() => {
        if (!session?.user) return null;
        return {
            _id: session.user.id,
            _creationTime: Date.now(),
            email: session.user.email,
            name: session.user.name ?? session.user.email,
            role: session.user.role,
        } as any;
    }, [session]);

    if (isSessionLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>Redirecting to login...</div>
            </div>
        );
    }

    const userForProvider = (user as any) ?? fallbackUser;
    if (!userForProvider) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>Loading user...</div>
            </div>
        );
    }

    return <UserProvider user={userForProvider}>{children}</UserProvider>;
}
