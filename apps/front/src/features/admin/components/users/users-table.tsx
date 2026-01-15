'use client';

import { DataTable } from '@/features/table/components/table';
import { useTranslations } from 'next-intl';
import { useUsersTableColumns } from './users-table-columns';
import { BetterAuthUser, PaginationResult } from '@repo/backend/convex/admin';

export function UsersTable({ users }: { users: PaginationResult<BetterAuthUser> | null }) {

    const t = useTranslations('Admin');
    const columns = useUsersTableColumns();

    return (
        <div className="space-y-4">
            <DataTable columns={columns} data={users?.page || []} />
            {users?.page?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    {t('usersTable.empty')}
                </p>
            )}
        </div>
    );
}
