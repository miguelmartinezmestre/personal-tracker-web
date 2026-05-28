'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/components/data-table/components/table';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { ADMIN_PAGE_SIZE } from '@/lib/pagination';

export function UsersTable() {
    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } =
        useServerPagination(ADMIN_PAGE_SIZE);

    const users = useQuery(convexQuery(api.admin.listUsers, { paginationOpts }));

    const continueCursor = users.data?.continueCursor ?? null;
    const pageIsDone = users.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const userRows: Doc<'user'>[] = users.data?.page ?? [];

    return (
        <div className="space-y-4" data-testid="admin-users-table">
            <DataTable
                columns={columns}
                data={userRows}
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
            {userRows.length === 0 && !users.isLoading && (
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
