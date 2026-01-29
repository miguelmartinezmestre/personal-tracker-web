import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Doc } from '@/convex/_generated/dataModel';

export function useAuditLogsTableColumns() {
    const t = useTranslations('Admin');

    const columns: ColumnDef<Doc<'auditLogs'>>[] = [
        {
            accessorKey: 'user',
            header: t('auditLogsTable.columns.userId'),
            cell: ({ row }) => {
                const userId = row.original.userId;
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

    return columns;
}
