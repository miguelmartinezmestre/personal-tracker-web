'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { UserSessions } from '@/features/admin/components/user-sessions';
import { useTranslations } from 'next-intl';

export default function AdminSessionsPage() {
    const t = useTranslations('Admin');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>
                    {t('sessionManagement')}
                </h1>
                <p className="text-muted-foreground">{t('sessionManagementDescription')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('sessionManagement')}</CardTitle>
                    <CardDescription>{t('sessionManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <UserSessions data-tour="admin-sessions" />
                </CardContent>
            </Card>
        </div>
    );
}
