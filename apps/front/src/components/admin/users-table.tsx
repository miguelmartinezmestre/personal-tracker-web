'use client';

import { DataTable } from '@/components/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { Ban, UserCheck, Trash2, ShieldAlert } from 'lucide-react';
import { EditUserModal } from './edit-user-modal';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRequireAdmin } from '@/hooks/use-user-role';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

type User = {
    id: string;
    email: string;
    name: string;
    role?: string | string[];
    banned?: boolean;
    banExpires?: number;
    banReason?: string;
    createdAt?: number;
};

export function UsersTable() {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const [searchValue, _setSearchValue] = useState('');
    const [page, _setPage] = useState(0);
    const limit = 10;
    const queryClient = useQueryClient();

    // Listar usuarios
    const {
        data: userData,
        isLoading: isLoadingUsers,
        refetch,
    } = useQuery({
        queryKey: ['admin-users', searchValue, page, limit],
        queryFn: async () => {
            try {
                const result = await authClient.admin.listUsers({
                    query: {
                        searchValue: searchValue || undefined,
                        searchField: 'email',
                        limit,
                        offset: page * limit,
                        sortBy: 'createdAt',
                        sortDirection: 'desc',
                    },
                });
                // El resultado puede estar envuelto en un tipo Data, extraer los datos reales
                const data = (result as { data?: unknown })?.data || result;
                return data || { users: [], total: 0 };
            } catch (err: unknown) {
                console.error('Error fetching users:', err);
                // Si hay un error de permisos, retornar estructura vacía
                return { users: [], total: 0 };
            }
        },
    });

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

    // Verify admin role
    try {
        useRequireAdmin();
    } catch {
        return (
            <div className="rounded-md border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-800">{t('accessDeniedTitle')}</h3>
                        <p className="text-sm text-red-600">{t('accessDeniedDescription')}</p>
                    </div>
                </div>
            </div>
        );
    }

    const columns: ColumnDef<User>[] = [
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
                                onClick={() => unbanUser.mutate({ userId: user.id })}
                                disabled={unbanUser.isPending}
                                data-testid="user-unban-button"
                            >
                                <UserCheck className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => banUser.mutate({ userId: user.id })}
                                disabled={banUser.isPending}
                                data-testid="user-ban-button"
                            >
                                <Ban className="h-4 w-4" />
                            </Button>
                        )}
                        <DeleteConfirmationDialog
                            onConfirm={async () => {
                                await deleteUser.mutateAsync({ userId: user.id });
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

    const users = (userData as { users?: User[]; total?: number })?.users || [];
    const _total = (userData as { users?: User[]; total?: number })?.total || 0;

    return (
        <div className="space-y-4">
            <DataTable columns={columns} data={users} isLoading={isLoadingUsers} />
            {users.length === 0 && !isLoadingUsers && (
                <p className="text-center text-muted-foreground py-8">
                    {searchValue ? t('usersTable.emptyWithSearch') : t('usersTable.empty')}
                </p>
            )}
        </div>
    );
}
