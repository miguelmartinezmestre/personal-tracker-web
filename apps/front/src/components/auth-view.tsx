'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { UserProvider } from '@/contexts/user-context';
import { useCurrentUser } from '@/hooks/api/use-auth';

export default function AuthenticatedView({ children }: { children: React.ReactNode }) {
    const tCommon = useTranslations('Common');
    const router = useRouter();

    // `better-auth` exposes a `useSession()` hook via the client.
    // Its return shape may differ slightly by version, so we read the common fields.
    const sessionQuery = authClient.useSession();
    const session = sessionQuery?.data;
    const isSessionLoading = Boolean(sessionQuery?.isPending ?? sessionQuery?.isLoading);

    // Only query for the current user once we have a session.
    const user = useCurrentUser(!session?.user);

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
        } as {
            _id: string;
            _creationTime: number;
            email: string;
            name: string;
            role?: string | string[];
        };
    }, [session]);

    if (isSessionLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('loading')}</div>
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('redirectingToLogin')}</div>
            </div>
        );
    }

    const userForProvider = user ?? fallbackUser;
    if (!userForProvider) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('loadingUser')}</div>
            </div>
        );
    }

    return <UserProvider user={userForProvider}>{children}</UserProvider>;
}
