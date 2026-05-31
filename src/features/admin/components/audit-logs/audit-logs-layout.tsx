'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogsTable } from '@/features/admin/components/audit-logs/audit-logs-table';
import { useTranslations } from 'next-intl';
import { useConvexAuth } from 'convex/react';

export default function AuditLogsLayout() {
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
                    data-testid="admin-audit-title"
                >
                    {t('auditLogManagement')}
                </h1>
                <p className="text-muted-foreground">{t('auditLogManagementDescription')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('auditLogManagement')}</CardTitle>
                    <CardDescription>{t('auditLogManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <AuditLogsTable />
                </CardContent>
            </Card>
        </div>
    );
}
