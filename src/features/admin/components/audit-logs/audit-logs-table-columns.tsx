import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { useLocale, useTranslations } from 'next-intl';
import type { Doc } from '@/convex/_generated/dataModel';
import { formatDate, formatTime } from '@/lib/format-date';

export function useAuditLogsTableColumns() {
    const t = useTranslations('Admin');
    const locale = useLocale();

    const columns: ColumnDef<DataTableFeatures, Doc<'auditLogs'>>[] = [
        {
            accessorKey: 'user',
            header: t('auditLogsTable.columns.userId'),
            cell: ({ row }) => {
                const userId = row.original.userId;
                return <span className="font-mono text-xs">{userId}</span>;
            },
        },
        {
            accessorKey: 'actor',
            header: t('auditLogsTable.columns.actorUserId'),
            cell: ({ row }) => {
                const actorUserId = row.original.actorUserId;
                return <span className="font-mono text-xs">{actorUserId ?? ''}</span>;
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
                return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
            },
        },
    ];

    return columns;
}
