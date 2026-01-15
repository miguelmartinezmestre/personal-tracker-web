'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/card';
import { AuditLogs } from '@/features/admin/components/audit-logs';
import { useTranslations } from 'next-intl';

export default function AdminAuditPage() {
    const t = useTranslations('Admin');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level={1}>
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
                    <AuditLogs />
                </CardContent>
            </Card>
        </div>
    );
}
