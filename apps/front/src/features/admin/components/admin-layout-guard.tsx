'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';

// This component only checks admin role, not authentication
// Authentication is already verified in dashboard/layout.tsx via AuthenticatedView
export function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
    const tCommon = useTranslations('Common');
    const router = useRouter();
    const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));

    const userRole = user?.role;
    const isAdmin = userRole === 'admin' || (Array.isArray(userRole) && userRole.includes('admin'));

    useEffect(() => {
        if (!isAdmin) {
            router.replace('/dashboard/home?error=unauthorized');
        }
    }, [isAdmin, router]);

    if (!isAdmin) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('redirecting')}</div>
            </div>
        );
    }

    return <>{children}</>;
}
