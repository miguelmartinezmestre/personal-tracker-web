'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { isGlobalAdminRole } from '@/convex/features/auth/roles';
import AdminAudit from '@/features/admin/components/admin-audit';
import AdminCategories from '@/features/admin/components/admin-categories';
import AdminUsers from '@/features/admin/components/admin-users';

/** Platform administration, only for the global admin; every function checks it again. */
export default function AdminPage() {
    const t = useTranslations('Admin');
    const user = useQuery(convexQuery(api.auth.getCurrentUser, {}));

    if (user.isError) {
        return <QueryErrorFallback onRetry={() => void user.refetch()} />;
    }

    if (!user.data) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (!isGlobalAdminRole(user.data.role)) {
        return (
            <p className="text-muted-foreground" data-testid="admin-forbidden">
                {t('forbidden')}
            </p>
        );
    }

    return (
        <div className="w-full min-w-0 space-y-10" data-testid="admin-page">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <AdminUsers currentUserId={user.data._id} />
            <AdminCategories />
            <AdminAudit />
        </div>
    );
}
