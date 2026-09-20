import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import { UserCheck, Ban, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EditUserModal } from './edit-user-modal';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { useBanUser, useDeleteUser, useUnBanUser } from './users-table-actions';
import { GLOBAL_ADMIN_ROLE } from '@shared/platform-roles';

export function useUsersTableColumns({
    setupUserId,
    currentUser,
}: {
    setupUserId: Id<'user'> | null | undefined;
    currentUser: Doc<'user'> | undefined;
}) {
    const t = useTranslations('Admin');
    const tCommon = useTranslations('Common');

    const { banUser, isBanningUser } = useBanUser();
    const { unbanUser, isUnbanningUser } = useUnBanUser();
    const { deleteUserAsync, isDeletingUser } = useDeleteUser();

    const getRoleLabel = (role: string | null | undefined) => {
        if (role === GLOBAL_ADMIN_ROLE) {
            return t('usersTable.roles.globalAdmin');
        }
        return role || t('usersTable.roles.user');
    };

    const columns: ColumnDef<DataTableFeatures, Doc<'user'>>[] = [
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
                return <Badge>{getRoleLabel(row.original.role)}</Badge>;
            },
        },
        {
            accessorKey: 'banned',
            header: t('usersTable.columns.status'),
            cell: ({ row }) => {
                const user = row.original;
                if (user.banned) {
                    return (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            {tCommon('status.banned')}
                        </Badge>
                    );
                }
                return (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
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
                        <EditUserModal
                            user={user}
                            roleLocked={isSetupUser || currentUser?._id === user._id}
                        />
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
                        ) : (
                            <DeleteConfirmationDialog
                                onConfirm={async () => {
                                    await deleteUserAsync({ userId: user._id });
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
