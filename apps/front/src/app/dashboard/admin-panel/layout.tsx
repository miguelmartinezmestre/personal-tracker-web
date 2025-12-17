'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AdminLayout as AdminLayoutComponent } from '@/components/admin-layout';
import { authClient } from '@/lib/auth-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const tCommon = useTranslations('Common');
    const router = useRouter();

    const sessionQuery = authClient.useSession();
    const session = sessionQuery?.data;
    const isSessionLoading = sessionQuery?.isPending;

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

    if (!isAdmin) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('redirecting')}</div>
            </div>
        );
    }

    return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
