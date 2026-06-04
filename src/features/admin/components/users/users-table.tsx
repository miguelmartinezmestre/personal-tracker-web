'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/data-table/components/table';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { ADMIN_PAGE_SIZE } from '@/lib/pagination';

export function UsersTable() {
    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();
    const [search, setSearch] = useState('');

    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage, reset } =
        useServerPagination(ADMIN_PAGE_SIZE);

    const searchValue = search.trim() || undefined;

    const users = useQuery(
        convexQuery(api.admin.listUsers, {
            paginationOpts,
            searchValue,
        })
    );

    const continueCursor = users.data?.continueCursor ?? null;
    const pageIsDone = users.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const userRows: Doc<'user'>[] = users.data?.page ?? [];

    const handleSearchChange = (value: string) => {
        setSearch(value);
        reset();
    };

    const isSearchActive = Boolean(searchValue);
    const emptyMessage = isSearchActive ? t('usersTable.emptyWithSearch') : t('usersTable.empty');

    return (
        <div className="space-y-4" data-testid="admin-users-table">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder={t('usersTable.searchPlaceholder')}
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-10"
                    data-testid="admin-users-search-input"
                />
            </div>
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
                    {emptyMessage}
                </p>
            )}
        </div>
    );
}
