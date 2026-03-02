'use client';

import { DataTable } from '@/features/table/components/table';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { PaginationResult } from 'convex/server';
import { Doc } from '@/convex/_generated/dataModel';

export function UsersTable({ users }: { users: PaginationResult<Doc<'user'>> | null }) {
    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();

    return (
        <div className="space-y-4">
            <DataTable columns={columns} data={users?.page || []} />
            {users?.page?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t('usersTable.empty')}</p>
            )}
        </div>
    );
}
