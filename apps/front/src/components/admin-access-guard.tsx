'use client';

import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { useUserRole } from '@/hooks/use-user-role';

interface AdminAccessGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AdminAccessGuard({ children, fallback }: AdminAccessGuardProps) {
    const { isAdmin } = useUserRole();

    // Note: isLoading is not available in current useUserRole hook
    // We'll show loading state at a higher level if needed

    if (!isAdmin) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <Alert variant="destructive" className="my-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You don't have administrator permissions to access this feature.
                </AlertDescription>
            </Alert>
        );
    }

    return <>{children}</>;
}
