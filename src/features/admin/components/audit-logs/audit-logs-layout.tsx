'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogsTable } from '@/features/admin/components/audit-logs/audit-logs-table';
import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import { FunctionReturnType } from 'convex/server';

type AuditLogsResult = FunctionReturnType<typeof api.auditLogs.getAuditLogs>;

export default function AuditLogsLayout({
    preloadedAuditLogsQuery,
}: {
    preloadedAuditLogsQuery: Preloaded<typeof api.auditLogs.getAuditLogs>;
}) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return <AuditLogsContent preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}

function AuditLogsContent({
    preloadedAuditLogsQuery,
}: {
    preloadedAuditLogsQuery: Preloaded<typeof api.auditLogs.getAuditLogs>;
}) {
    const t = useTranslations('Admin');
    const logs = usePreloadedQuery(preloadedAuditLogsQuery);

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
                    <AuditLogsTable initialLogs={(logs as AuditLogsResult) ?? undefined} />
                </CardContent>
            </Card>
        </div>
    );
}
