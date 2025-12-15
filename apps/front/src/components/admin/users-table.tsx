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
import { useRequireAdmin } from '@/hooks/use-user-role';

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
    const [searchValue, setSearchValue] = useState('');
    const [page, setPage] = useState(0);
    const limit = 10;
    const queryClient = useQueryClient();

    // Verify admin role
    try {
        useRequireAdmin();
    } catch (error) {
        return (
            <div className="rounded-md border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-800">Acceso Denegado</h3>
                        <p className="text-sm text-red-600">
                            No tienes permisos de administrador para acceder a esta función.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Listar usuarios
    const {
        data: userData,
        isLoading: isLoadingUsers,
        refetch,
        error,
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
                const data = (result as any)?.data || result;
                return data || { users: [], total: 0 };
            } catch (err: any) {
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
                banReason: reason || 'Banned by administrator',
            });
        },
        onSuccess: () => {
            toast.success('Usuario baneado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(`Error al banear usuario: ${error.message}`);
        },
    });

    // Unban usuario
    const unbanUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            return await authClient.admin.unbanUser({ userId });
        },
        onSuccess: () => {
            toast.success('Usuario desbaneado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(`Error al desbanear usuario: ${error.message}`);
        },
    });

    // Eliminar usuario
    const deleteUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            if (
                !confirm(
                    '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.'
                )
            ) {
                return;
            }
            return await authClient.admin.removeUser({ userId });
        },
        onSuccess: () => {
            toast.success('Usuario eliminado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar usuario: ${error.message}`);
        },
    });

    const columns: ColumnDef<User>[] = [
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            accessorKey: 'name',
            header: 'Nombre',
        },
        {
            accessorKey: 'role',
            header: 'Rol',
            cell: ({ row }) => {
                const role = row.original.role;
                if (!role) return <Badge variant="secondary">user</Badge>;
                const roles = Array.isArray(role) ? role : [role];
                return (
                    <div className="flex gap-1">
                        {roles.map((r, i) => (
                            <Badge
                                key={i}
                                variant={r === 'admin' || r === 'ADMIN' ? 'default' : 'secondary'}
                            >
                                {r}
                            </Badge>
                        ))}
                    </div>
                );
            },
        },
        {
            accessorKey: 'banned',
            header: 'Estado',
            cell: ({ row }) => {
                const banned = row.original.banned;
                if (banned) {
                    return (
                        <Badge variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Baneado
                        </Badge>
                    );
                }
                return (
                    <Badge variant="outline" className="text-green-600">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activo
                    </Badge>
                );
            },
        },
        {
            header: 'Acciones',
            id: 'actions',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex gap-2">
                        <EditUserModal user={user} onSuccess={() => refetch()} />
                        {user.banned ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unbanUser.mutate({ userId: user.id })}
                                disabled={unbanUser.isPending}
                            >
                                <UserCheck className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const reason = prompt('Razón del ban (opcional):');
                                    banUser.mutate({
                                        userId: user.id,
                                        reason: reason || undefined,
                                    });
                                }}
                                disabled={banUser.isPending}
                            >
                                <Ban className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser.mutate({ userId: user.id })}
                            disabled={deleteUser.isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    if (isLoadingUsers) {
        return <div>Cargando usuarios...</div>;
    }

    if (error) {
        return (
            <div>
                Error al cargar usuarios:{' '}
                {error instanceof Error ? error.message : 'Error desconocido'}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchValue}
                    onChange={e => {
                        setSearchValue(e.target.value);
                        setPage(0);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">
                        Error al cargar usuarios: {(error as Error)?.message || 'Error desconocido'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Asegúrate de tener permisos de administrador para acceder a esta sección.
                    </p>
                </div>
            )}
            <DataTable columns={columns} data={userData?.users || []} isLoading={isLoadingUsers} />
            {userData && userData?.users && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Mostrando {userData.users.length} de {userData.total || 0} usuarios
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={(page + 1) * limit >= (userData.total || 0)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
