'use client';

import { DataTable } from '@/components/table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Doc } from '@repo/backend/convex/_generated/dataModel';
import { format } from 'date-fns';
import { useRequireAdmin } from '@/hooks/use-user-role';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AuditLogs() {
    const t = useTranslations('Admin');

    const logs = useSuspenseQuery(convexQuery(api.auditLogs.getAuditLogs, {}));

    // Verify admin role
    try {
        useRequireAdmin();
    } catch {
        return (
            <div className="rounded-md border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-800">{t('accessDeniedTitle')}</h3>
                        <p className="text-sm text-red-600">{t('accessDeniedDescription')}</p>
                    </div>
                </div>
            </div>
        );
    }

    const columns: ColumnDef<Doc<'auditLogs'>>[] = [
        {
            accessorKey: 'user',
            header: t('auditLogsTable.columns.userId'),
            cell: ({ row }) => {
                const userId = row.original.user;
                return <span className="font-mono text-xs">{userId}</span>;
            },
        },
        {
            accessorKey: 'action',
            header: t('auditLogsTable.columns.action'),
            cell: ({ row }) => {
                const action = row.original.action;
                return <span className="font-medium">{action}</span>;
            },
        },
        {
            accessorKey: 'createdAt',
            header: t('auditLogsTable.columns.date'),
            cell: ({ row }) => {
                const date = row.original.createdAt;
                return format(new Date(date), 'PPp');
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">{t('auditLogsTable.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('auditLogsTable.description')}
                </p>
            </div>
            <DataTable columns={columns} data={logs.data || []} isLoading={logs.isLoading} />
            {logs.data && logs.data.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    {t('auditLogsTable.empty')}
                </p>
            )}
        </div>
    );
}
