'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/components/data-table/components/table';
import { useTranslations } from 'next-intl';
import { useAuditLogsTableColumns } from './audit-logs-table-columns';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';

const DEFAULT_PAGE_SIZE = 20;

type AuditLogsResult = FunctionReturnType<typeof api.auditLogs.getAuditLogs>;

interface AuditLogsTableProps {
    initialLogs: AuditLogsResult | undefined;
}

export function AuditLogsTable({ initialLogs }: AuditLogsTableProps) {
    const t = useTranslations('Admin');
    const columns = useAuditLogsTableColumns();

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const isFirstPage = paginationOpts.cursor === null;

    const logs = useQuery({
        ...convexQuery(api.auditLogs.getAuditLogs, { paginationOpts }),
        initialData: isFirstPage ? initialLogs : undefined,
    });

    const continueCursor = logs.data?.continueCursor ?? null;
    const pageIsDone = logs.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const data: Doc<'auditLogs'>[] = logs.data?.page ?? [];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">{t('auditLogsTable.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('auditLogsTable.description')}
                </p>
            </div>
            <DataTable
                columns={columns}
                data={data}
                isLoading={logs.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: logs.isFetching,
                }}
            />
            {data.length === 0 && !logs.isLoading && (
                <p className="text-center text-muted-foreground py-8">
                    {t('auditLogsTable.empty')}
                </p>
            )}
        </div>
    );
}
