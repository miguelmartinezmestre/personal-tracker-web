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

const DEFAULT_PAGE_SIZE = 20;

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

    const sessions = useQuery({
        ...convexQuery(api.sessions.getSessionsByUser, { paginationOpts }),
        initialData: isFirstPage ? initialSessions : undefined,
    });

    const sessionsData = sessions.data as SessionsResult | undefined;
    const continueCursor = sessionsData?.continueCursor ?? null;
    const pageIsDone = sessionsData?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const data: SessionsResult['page'] = sessionsData?.page ?? [];
    const [now] = useState(Date.now);
    const revocableSessions = data.filter(
        (session: SessionsResult['page'][number]) => !session.isCurrent && session.expiresAt >= now
    );
    const currentSessionId = data.find((s: SessionsResult['page'][number]) => s.isCurrent)?._id;
    const canRevokeAllOtherSessions =
        Boolean(currentSessionId) && revocableSessions.length > 0 && !sessions.isLoading;

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
                data={data}
                isLoading={sessions.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: sessions.isFetching,
                }}
            />
        </div>
    );
}
