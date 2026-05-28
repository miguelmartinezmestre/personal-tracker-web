'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersTable } from '@/features/admin/components/users/users-table';
import { useTranslations } from 'next-intl';
import { useConvexAuth } from 'convex/react';

export default function UsersLayout() {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const t = useTranslations('Admin');

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-3xl font-bold tracking-tight"
                    role="heading"
                    aria-level={1}
                    data-testid="admin-users-title"
                >
                    {t('userManagement')}
                </h1>
                <p className="text-muted-foreground">{t('userManagementDescription')}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('userManagement')}</CardTitle>
                    <CardDescription>{t('userManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable />
                </CardContent>
            </Card>
        </div>
    );
}
