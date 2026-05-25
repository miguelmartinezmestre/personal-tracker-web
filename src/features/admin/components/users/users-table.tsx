'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/components/data-table/components/table';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';

const DEFAULT_PAGE_SIZE = 10;
const INITIAL_USERS_STALE_TIME_MS = 30_000;

type UsersResult = FunctionReturnType<typeof api.admin.listUsers>;

interface UsersTableProps {
    initialUsers: UsersResult | undefined;
}

export function UsersTable({ initialUsers }: UsersTableProps) {
    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const isFirstPage = paginationOpts.cursor === null;

    const users = useQuery({
        ...convexQuery(api.admin.listUsers, { paginationOpts }),
        initialData: isFirstPage ? initialUsers : undefined,
        staleTime: isFirstPage && initialUsers ? INITIAL_USERS_STALE_TIME_MS : 0,
    });

    const continueCursor = users.data?.continueCursor ?? null;
    const pageIsDone = users.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const data: Doc<'user'>[] = users.data?.page ?? [];

    return (
        <div className="space-y-4" data-testid="admin-users-table">
            <DataTable
                columns={columns}
                data={data}
                isLoading={users.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: users.isFetching,
                }}
            />
            {data.length === 0 && !users.isLoading && (
                <p
                    className="text-center text-muted-foreground py-8"
                    data-testid="admin-users-empty"
                >
                    {t('usersTable.empty')}
                </p>
            )}
        </div>
    );
}
