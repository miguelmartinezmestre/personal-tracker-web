'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { UsersTable } from '@/features/admin/components/users/users-table';
import { useTranslations } from 'next-intl';
import { api } from '@repo/backend/convex/_generated/api';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';

export default function UsersLayout({
    preloadedUsersQuery,
}: {
    preloadedUsersQuery: Preloaded<typeof api.admin.listUsers>;
}) {
    const t = useTranslations('Admin');
    const users = usePreloadedAuthQuery(preloadedUsersQuery);

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
                    <UsersTable users={users} />
                </CardContent>
            </Card>
        </div>
    );
}
