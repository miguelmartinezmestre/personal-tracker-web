'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/features/table/components/table';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserSessionsTableColumns } from './user-sessions-table-columns';
import { useConfirmRevokeAllSessions } from './user-sessions-table-actions';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import type { Id } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';

const DEFAULT_PAGE_SIZE = 10;

type UserSessionsQueryResult = FunctionReturnType<typeof api.admin.listUserSessions>;

export function UserSessions() {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');
    const [userId, setUserId] = useState('');
    const columns = useUserSessionsTableColumns(userId ? (userId as Id<'user'>) : undefined);
    const { revokeAllSessions, isRevokingAllSessions } = useConfirmRevokeAllSessions();

    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
        reset,
    } = useServerPagination(DEFAULT_PAGE_SIZE);

    const paginationOpts = getPaginationOpts(currentPage);

    const { data: sessionsQueryResult, isLoading } = useQuery(
        convexQuery(
            api.admin.listUserSessions,
            userId ? { userId: userId as Id<'user'>, paginationOpts } : 'skip'
        )
    );

    const sessions = sessionsQueryResult as UserSessionsQueryResult | undefined;

    const hasData = sessions !== undefined;
    const continueCursor = sessions?.continueCursor ?? null;
    const pageIsDone = sessions?.isDone ?? false;

    useEffect(() => {
        if (!hasData) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, updateCursor]);

    const data = sessions?.page ?? [];
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder={tCommon('placeholders.userIdForSessions')}
                    value={userId}
                    onChange={e => {
                        reset();
                        setUserId(e.target.value);
                    }}
                    className="flex-1"
                    data-testid="user-sessions-userid-input"
                />
                {userId && (
                    <Button
                        variant="destructive"
                        onClick={() => revokeAllSessions({ userId })}
                        disabled={isRevokingAllSessions}
                        data-testid="user-sessions-revoke-all-button"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('userSessions.buttons.revokeAll')}
                    </Button>
                )}
            </div>
            {userId ? (
                <>
                    <DataTable
                        columns={columns}
                        data={data}
                        isLoading={isLoading}
                        pagination={{
                            currentPage,
                            totalPages,
                            onPageChange: goToPage,
                            hasNextPage,
                            hasPreviousPage,
                            pageSize: DEFAULT_PAGE_SIZE,
                        }}
                    />
                    {data.length === 0 && !isLoading && (
                        <p className="text-center text-muted-foreground py-8">
                            {t('userSessions.emptyWithUser')}
                        </p>
                    )}
                </>
            ) : (
                <p className="text-center text-muted-foreground py-8">
                    {t('userSessions.emptyNoUser')}
                </p>
            )}
        </div>
    );
}
