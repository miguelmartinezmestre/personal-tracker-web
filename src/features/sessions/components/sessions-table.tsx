'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/features/table/components/table';
import { useSessionsTableColumns } from './sessions-table-columns';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { Button } from '@/components/ui/button';
import { useInvalidateAllOtherSessions } from './sessions-table-actions';

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
    const t = useTranslations('Sessions');
    const columns = useSessionsTableColumns({
        currentSessionToken,
    });
    const { invalidateAllOtherSessionsAsync, isInvalidatingAllOtherSessions } =
        useInvalidateAllOtherSessions();

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
    const [now] = useState(Date.now);
    const revocableSessions = data.filter(
        session => session.token !== currentSessionToken && session.expiresAt >= now
    );
    const canRevokeAllOtherSessions =
        Boolean(currentSessionToken) && revocableSessions.length > 0 && !sessions.isLoading;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!canRevokeAllOtherSessions || isInvalidatingAllOtherSessions}
                    onClick={async () => {
                        if (!currentSessionToken) {
                            return;
                        }

                        await invalidateAllOtherSessionsAsync({
                            currentToken: currentSessionToken,
                        });
                    }}
                    data-testid="sessions-revoke-other-button"
                >
                    {isInvalidatingAllOtherSessions ? t('revoking') : t('revokeAllOtherSessions')}
                </Button>
            </div>
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
