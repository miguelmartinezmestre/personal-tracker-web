'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/data-table/components/table';
import { useSessionsTableColumns } from './sessions-table-columns';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';
import { Button } from '@/components/ui/button';
import { useInvalidateAllOtherSessions } from './sessions-table-actions';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type SessionsResult = FunctionReturnType<typeof api.sessions.getSessionsByUser>;

interface SessionsTableProps {
    initialSessions: SessionsResult | undefined;
}

export default function SessionsTable({ initialSessions }: SessionsTableProps) {
    const t = useTranslations('Sessions');
    const columns = useSessionsTableColumns();
    const { invalidateAllOtherSessionsAsync, isInvalidatingAllOtherSessions } =
        useInvalidateAllOtherSessions();

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const isFirstPage = paginationOpts.cursor === null;

    const sessionsQuery = useQuery({
        ...convexQuery(api.sessions.getSessionsByUser, { paginationOpts }),
        initialData: isFirstPage ? initialSessions : undefined,
    });

    const sessionsData = sessionsQuery.data as SessionsResult | undefined;
    const continueCursor = sessionsData?.continueCursor ?? null;
    const pageIsDone = sessionsData?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const sessionRows: SessionsResult['page'] = sessionsData?.page ?? [];
    const [now] = useState(Date.now);
    const revocableSessions = sessionRows.filter(
        (session: SessionsResult['page'][number]) => !session.isCurrent && session.expiresAt >= now
    );
    const currentSessionId = sessionRows.find(
        (session: SessionsResult['page'][number]) => session.isCurrent
    )?._id;
    const canRevokeAllOtherSessions =
        Boolean(currentSessionId) && revocableSessions.length > 0 && !sessionsQuery.isLoading;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!canRevokeAllOtherSessions || isInvalidatingAllOtherSessions}
                    onClick={async () => {
                        if (!currentSessionId) {
                            return;
                        }

                        await invalidateAllOtherSessionsAsync({
                            currentSessionId,
                        });
                    }}
                    data-testid="sessions-revoke-other-button"
                >
                    {isInvalidatingAllOtherSessions ? t('revoking') : t('revokeAllOtherSessions')}
                </Button>
            </div>
            <DataTable
                columns={columns}
                data={sessionRows}
                isLoading={sessionsQuery.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: sessionsQuery.isFetching,
                }}
            />
        </div>
    );
}
