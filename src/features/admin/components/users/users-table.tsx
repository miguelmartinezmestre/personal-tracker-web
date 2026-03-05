'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { DataTable } from '@/features/table/components/table';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';

const DEFAULT_PAGE_SIZE = 10;

type UsersResult = FunctionReturnType<typeof api.admin.listUsers>;

interface UsersTableProps {
    initialUsers: UsersResult | undefined;
}

export function UsersTable({ initialUsers }: UsersTableProps) {
    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();

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

    const users = useQuery({
        ...convexQuery(api.admin.listUsers, { paginationOpts }),
        initialData: isFirstPage ? initialUsers : undefined,
    });

    const hasData = users.data !== undefined;
    const continueCursor = users.data?.continueCursor ?? null;
    const pageIsDone = users.data?.isDone ?? false;

    useEffect(() => {
        if (!hasData || users.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, users.isFetching, updateCursor]);

    const data = (users.data?.page ?? []) as Doc<'user'>[];
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    return (
        <div className="space-y-4" data-testid="admin-users-table">
            <DataTable
                columns={columns}
                data={data}
                isLoading={users.isLoading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
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
