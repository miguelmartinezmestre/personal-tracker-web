'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import type { FunctionReturnType } from 'convex/server';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/components/table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from '@/convex/features/auth/roles';
import BanUserDialog from '@/features/admin/components/ban-user-dialog';
import UserSessionsDialog from '@/features/admin/components/user-sessions-dialog';

type AdminUser = FunctionReturnType<typeof api.admin.listUsers>['page'][number];

const SEARCH_DELAY_MS = 300;

export default function AdminUsers({ currentUserId }: { currentUserId: string }) {
    const t = useTranslations('Admin.users');
    const locale = useLocale();
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    // Waits for a pause in typing so each keystroke doesn't restart the paginated query.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const users = usePaginatedList(api.admin.listUsers, { search });
    const setRole = useMutation({ mutationFn: useConvexMutation(api.admin.setUserRole) });
    const unban = useMutation({ mutationFn: useConvexMutation(api.admin.unbanUser) });
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

    const roleItems = [
        { value: USER_ROLE, label: t('roles.user') },
        { value: GLOBAL_ADMIN_ROLE, label: t('roles.globalAdmin') },
    ];

    const columns: ColumnDef<DataTableFeatures, AdminUser>[] = [
        {
            id: 'user',
            header: t('user'),
            cell: ({ row }) => (
                <div className="min-w-0">
                    <span className="block font-medium">{row.original.name}</span>
                    <span className="text-muted-foreground block text-xs">
                        {row.original.email}
                    </span>
                </div>
            ),
        },
        {
            id: 'role',
            header: t('role'),
            cell: ({ row }) => (
                <Select
                    value={row.original.role}
                    items={roleItems}
                    disabled={row.original.id === currentUserId || setRole.isPending}
                    onValueChange={role => {
                        if (role === USER_ROLE || role === GLOBAL_ADMIN_ROLE) {
                            setRole.mutate(
                                { userId: row.original.id, role },
                                { onSuccess: () => toast.success(t('roleChanged')) }
                            );
                        }
                    }}
                >
                    <SelectTrigger aria-label={t('roleOf', { name: row.original.name })}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {roleItems.map(item => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ),
        },
        {
            id: 'status',
            header: t('status'),
            cell: ({ row }) => {
                if (!row.original.banned) {
                    return <Badge variant="secondary">{t('active')}</Badge>;
                }

                return (
                    <Badge variant="destructive" data-testid="admin-user-banned">
                        {row.original.banExpires === null
                            ? t('bannedForever')
                            : t('bannedUntil', {
                                  date: formatDate.format(row.original.banExpires),
                              })}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                // An admin never bans themself.
                let banAction = null;

                if (row.original.id !== currentUserId && row.original.banned) {
                    banAction = (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={unban.isPending}
                            onClick={() =>
                                unban.mutate(
                                    { userId: row.original.id },
                                    { onSuccess: () => toast.success(t('unbanned')) }
                                )
                            }
                            data-testid="admin-unban-button"
                        >
                            {t('unban')}
                        </Button>
                    );
                } else if (row.original.id !== currentUserId) {
                    banAction = <BanUserDialog userId={row.original.id} name={row.original.name} />;
                }

                return (
                    <div className="flex justify-end gap-2">
                        <UserSessionsDialog userId={row.original.id} name={row.original.name} />
                        {banAction}
                    </div>
                );
            },
        },
    ];

    return (
        <section className="space-y-4" data-testid="admin-users">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">{t('title')}</h2>
                <Input
                    type="search"
                    value={searchInput}
                    onChange={event => setSearchInput(event.target.value)}
                    placeholder={t('search')}
                    aria-label={t('search')}
                    className="sm:max-w-xs"
                    data-testid="admin-users-search"
                />
            </div>
            <DataTable
                columns={columns}
                data={users.data}
                isLoading={users.isLoading}
                pagination={users}
                emptyMessage={t('empty')}
            />
        </section>
    );
}
