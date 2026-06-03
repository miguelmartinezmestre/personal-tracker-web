import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { UserCheck, Ban, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { EditUserModal } from './edit-user-modal';
import { Doc } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { useBanUser, useDeleteUser, useUnBanUser } from './users-table-actions';
import { GLOBAL_ADMIN_ROLE } from '@shared/platform-roles';

export function useUsersTableColumns() {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const { banUser, isBanningUser } = useBanUser();
    const { unbanUser, isUnbanningUser } = useUnBanUser();
    const { deleteUser, isDeletingUser } = useDeleteUser();
    const { data: setupUserId } = useQuery(convexQuery(api.setup.getPlatformSetupUserId, {}));

    const getRoleLabel = (role: string | null | undefined) => {
        if (role === GLOBAL_ADMIN_ROLE) return t('usersTable.roles.globalAdmin');
        return role || t('usersTable.roles.user');
    };

    const columns: ColumnDef<Doc<'user'>>[] = [
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
                            {role.map(roleName => (
                                <Badge key={roleName}>{getRoleLabel(roleName)}</Badge>
                            ))}
                        </div>
                    );
                }
                return <Badge>{getRoleLabel(role)}</Badge>;
            },
        },
        {
            accessorKey: 'banned',
            header: t('usersTable.columns.status'),
            cell: ({ row }) => {
                const user = row.original;
                if (user.banned) {
                    return (
                        <Badge className="bg-red-100 text-red-800">
                            {tCommon('status.banned')}
                        </Badge>
                    );
                }
                return (
                    <Badge className="bg-green-100 text-green-800">
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
                const isSetupUser = setupUserId === user._id;

                return (
                    <div className="flex gap-2">
                        <EditUserModal user={user} />
                        {user.banned ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unbanUser({ userId: user._id })}
                                disabled={isUnbanningUser}
                                data-testid="user-unban-button"
                            >
                                <UserCheck className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => banUser({ userId: user._id })}
                                disabled={isBanningUser}
                                data-testid="user-ban-button"
                            >
                                <Ban className="h-4 w-4" />
                            </Button>
                        )}
                        {isSetupUser ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled
                                                data-testid="user-delete-button"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {t('usersTable.setupUserDeleteDisabled')}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <DeleteConfirmationDialog
                                onConfirm={async () => {
                                    await deleteUser({ userId: user._id });
                                }}
                                title={t('usersTable.confirm.deleteUser')}
                                description={t('usersTable.confirm.deleteUserDescription')}
                                confirmLabel={t('usersTable.confirm.deleteConfirm')}
                                cancelLabel={t('usersTable.confirm.cancel')}
                                isLoading={isDeletingUser}
                                trigger={
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={isDeletingUser}
                                        data-testid="user-delete-button"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        )}
                    </div>
                );
            },
        },
    ];

    return columns;
}
