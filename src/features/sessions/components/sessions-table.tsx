'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/features/table/components/table';
import { useSessionsTableColumns } from './sessions-table-columns';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';

const DEFAULT_PAGE_SIZE = 20;

type SessionsResult = FunctionReturnType<typeof api.sessions.getSessionsByUser>;

interface SessionsTableProps {
    initialSessions: SessionsResult | undefined;
    currentSessionToken: string | undefined;
}

export default function SessionsTable({
    initialSessions,
    currentSessionToken,
}: SessionsTableProps) {
    const columns = useSessionsTableColumns({
        currentSessionToken,
    });

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

    const sessions = useQuery({
        ...convexQuery(api.sessions.getSessionsByUser, { paginationOpts }),
        initialData: isFirstPage ? initialSessions : undefined,
    });

    const hasData = sessions.data !== undefined;
    const continueCursor = sessions.data?.continueCursor ?? null;
    const pageIsDone = sessions.data?.isDone ?? false;

    useEffect(() => {
        if (!hasData || sessions.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, sessions.isFetching, updateCursor]);

    const data = (sessions.data?.page ?? []) as Doc<'session'>[];
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    return (
        <div>
            <DataTable
                columns={columns}
                data={data}
                isLoading={sessions.isLoading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
                }}
            />
        </div>
    );
}
