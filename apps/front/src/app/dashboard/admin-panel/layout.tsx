'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout as AdminLayoutComponent } from '@/components/admin-layout';
import { authClient } from '@/lib/auth-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const sessionQuery = authClient.useSession() as any;
    const session = sessionQuery?.data;
    const isSessionLoading = Boolean(sessionQuery?.isPending ?? sessionQuery?.isLoading);

    const userRole = session?.user?.role;
    const isAdmin =
        userRole === 'admin' ||
        userRole === 'ADMIN' ||
        (Array.isArray(userRole) && (userRole.includes('admin') || userRole.includes('ADMIN')));

    useEffect(() => {
        if (isSessionLoading) return;

        if (!session?.user) {
            router.replace('/login?redirect=/dashboard/admin-panel');
            return;
        }

        if (!isAdmin) {
            router.replace('/dashboard/home?error=unauthorized');
        }
    }, [isSessionLoading, session, isAdmin, router]);

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

    if (!isAdmin) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>Redirecting...</div>
            </div>
        );
    }

    return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
