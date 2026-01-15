'use client';

import { DataTable } from '@/features/table/components/table';
import { useTranslations } from 'next-intl';
import { useAuditLogsTableColumns } from './audit-logs-table-columns';
import { Doc } from '@repo/backend/convex/_generated/dataModel';

export function AuditLogsTable({ logs }: { logs: Doc<'auditLogs'>[] | null }) {
    const t = useTranslations('Admin');
    const columns = useAuditLogsTableColumns();
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">{t('auditLogsTable.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('auditLogsTable.description')}
                </p>
            </div>
            <DataTable columns={columns} data={logs || []} />
            {logs && logs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    {t('auditLogsTable.empty')}
                </p>
            )}
        </div>
    );
}
