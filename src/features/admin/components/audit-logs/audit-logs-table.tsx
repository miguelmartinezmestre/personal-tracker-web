'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/features/table/components/table';
import { useTranslations } from 'next-intl';
import { useAuditLogsTableColumns } from './audit-logs-table-columns';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
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

    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
    } = useServerPagination(DEFAULT_PAGE_SIZE);

    const paginationOpts = getPaginationOpts(currentPage);
    const isFirstPage = paginationOpts.cursor === null;

    const logs = useQuery({
        ...convexQuery(api.auditLogs.getAuditLogs, { paginationOpts }),
        initialData: isFirstPage ? initialLogs : undefined,
    });

    const hasData = logs.data !== undefined;
    const continueCursor = logs.data?.continueCursor ?? null;
    const pageIsDone = logs.data?.isDone ?? false;

    useEffect(() => {
        if (!hasData || logs.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, logs.isFetching, updateCursor]);

    const data: Doc<'auditLogs'>[] = logs.data?.page ?? [];
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

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
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
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
