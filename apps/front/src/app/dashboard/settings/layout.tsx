'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsLayout as SettingsLayoutComponent } from '@/components/settings-layout';
import { authClient } from '@/lib/auth-client';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const sessionQuery = authClient.useSession() as any;
    const session = sessionQuery?.data;
    const isSessionLoading = Boolean(sessionQuery?.isPending ?? sessionQuery?.isLoading);

    useEffect(() => {
        if (isSessionLoading) return;
        if (!session?.user) {
            router.replace('/login?redirect=/dashboard/settings');
        }
    }, [isSessionLoading, session, router]);

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

    return <SettingsLayoutComponent>{children}</SettingsLayoutComponent>;
}
