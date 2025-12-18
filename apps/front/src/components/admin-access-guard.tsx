'use client';

import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { useUser } from '@/contexts/user-context';
import { useUserRole } from '@/hooks/use-user-role';

interface AdminAccessGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

// Helper to check if a role is admin
function isAdminRole(role: string | string[] | undefined): boolean {
    if (!role) return false;
    if (role === 'admin' || role === 'ADMIN') return true;
    if (Array.isArray(role)) {
        return role.includes('admin') || role.includes('ADMIN');
    }
    return false;
}

export function AdminAccessGuard({ children, fallback }: AdminAccessGuardProps) {
    const t = useTranslations('Admin');
    
    // Try to use context user first (more efficient), fallback to useUserRole if needed
    let isAdmin = false;
    try {
        const user = useUser();
        isAdmin = isAdminRole((user as { role?: string | string[] })?.role);
    } catch {
        // Fallback to useUserRole if context not available
        const userRole = useUserRole();
        isAdmin = userRole.isAdmin;
    }

    if (!isAdmin) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <Alert variant="destructive" className="my-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{t('accessDeniedTitle')}</AlertTitle>
                <AlertDescription>{t('accessDeniedDescription')}</AlertDescription>
            </Alert>
        );
    }

    return <>{children}</>;
}
