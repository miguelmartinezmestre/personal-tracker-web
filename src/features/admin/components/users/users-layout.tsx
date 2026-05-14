'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersTable } from '@/features/admin/components/users/users-table';
import { useTranslations } from 'next-intl';
import { api } from '@/convex/_generated/api';
import { Preloaded } from 'convex/react';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';

type UsersResult = FunctionReturnType<typeof api.admin.listUsers>;

export default function UsersLayout({
    preloadedUsersQuery,
}: {
    preloadedUsersQuery: Preloaded<typeof api.admin.listUsers>;
}) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return <UsersContent preloadedUsersQuery={preloadedUsersQuery} />;
}

function UsersContent({
    preloadedUsersQuery,
}: {
    preloadedUsersQuery: Preloaded<typeof api.admin.listUsers>;
}) {
    const t = useTranslations('Admin');
    const users = usePreloadedQuery(preloadedUsersQuery);

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
                    <UsersTable initialUsers={users as UsersResult | undefined} />
                </CardContent>
            </Card>
        </div>
    );
}
