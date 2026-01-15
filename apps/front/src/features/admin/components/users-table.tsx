'use client';

import { DataTable } from '@/features/table/components/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { authClient } from '@/features/auth/auth-client';
import { useState } from 'react';
import { Ban, UserCheck, Trash2 } from 'lucide-react';
import { EditUserModal } from './edit-user-modal';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { BetterAuthUser } from '@repo/backend/convex/admin';

export function UsersTable({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const [searchValue, _setSearchValue] = useState('');
    const [page, _setPage] = useState(0);
    const limit = 10;
    const queryClient = useQueryClient();

    // Listar usuarios usando Convex
    const {
        data: userData,
        isLoading: isLoadingUsers,
        refetch,
    } = useQuery(
        convexQuery(api.admin.listUsers, {
            searchValue: searchValue || undefined,
            paginationOpts: {
                numItems: limit,
                cursor: null,
            },
        })
    );

    // Ban usuario
    const banUser = useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            return await authClient.admin.banUser({
                userId,
                banReason: reason || t('usersTable.defaults.banReason'),
            });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.bannedSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.banFailed', { message: error.message }));
        },
    });

    // Unban usuario
    const unbanUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            return await authClient.admin.unbanUser({ userId });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.unbannedSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.unbanFailed', { message: error.message }));
        },
    });

    // Eliminar usuario
    const deleteUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            return await authClient.admin.removeUser({ userId });
        },
        onSuccess: () => {
            toast.success(t('usersTable.toast.deletedSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: Error) => {
            toast.error(t('usersTable.toast.deleteFailed', { message: error.message }));
        },
    });

    const columns: ColumnDef<BetterAuthUser>[] = [
        {
            accessorKey: 'id',
            header: t('usersTable.columns.id'),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">{row.original._id}</span>
            ),
        },
        {
            accessorKey: 'email',
            header: t('usersTable.columns.email'),
        },
        {
            accessorKey: 'name',
            header: t('usersTable.columns.name'),
        },
        {
            accessorKey: 'role',
            header: t('usersTable.columns.role'),
            cell: ({ row }) => {
                const role = row.original.role;
                if (Array.isArray(role)) {
                    return (
                        <div className="flex gap-1">
                            {role.map((r, index) => (
                                <Badge key={index} variant="secondary">
                                    {r}
                                </Badge>
                            ))}
                        </div>
                    );
                }
                return <Badge variant="secondary">{role || t('usersTable.roles.user')}</Badge>;
            },
        },
        {
            accessorKey: 'banned',
            header: t('usersTable.columns.status'),
            cell: ({ row }) => {
                const user = row.original;
                if (user.banned) {
                    return <Badge variant="destructive">{tCommon('status.banned')}</Badge>;
                }
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                        {tCommon('status.active')}
                    </Badge>
                );
            },
        },
        {
            header: t('usersTable.columns.actions'),
            id: 'actions',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex gap-2">
                        <EditUserModal user={user} onSuccessAction={() => refetch()} />
                        {user.banned ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unbanUser.mutate({ userId: user._id })}
                                disabled={unbanUser.isPending}
                                data-testid="user-unban-button"
                            >
                                <UserCheck className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => banUser.mutate({ userId: user._id })}
                                disabled={banUser.isPending}
                                data-testid="user-ban-button"
                            >
                                <Ban className="h-4 w-4" />
                            </Button>
                        )}
                        <DeleteConfirmationDialog
                            onConfirm={async () => {
                                await deleteUser.mutateAsync({ userId: user._id });
                            }}
                            title={t('usersTable.confirm.deleteUser')}
                            description={t('usersTable.confirm.deleteUserDescription')}
                            confirmLabel={t('usersTable.confirm.deleteConfirm')}
                            cancelLabel={t('usersTable.confirm.cancel')}
                            isLoading={deleteUser.isPending}
                            trigger={
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={deleteUser.isPending}
                                    data-testid="user-delete-button"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            }
                        />
                    </div>
                );
            },
        },
    ];

    console.log(userData);

    return (
        <div className="space-y-4" {...props}>
            <DataTable columns={columns} data={userData?.page || []} isLoading={isLoadingUsers} />
            {userData?.page?.length === 0 && !isLoadingUsers && (
                <p className="text-center text-muted-foreground py-8">
                    {searchValue ? t('usersTable.emptyWithSearch') : t('usersTable.empty')}
                </p>
            )}
        </div>
    );
}
