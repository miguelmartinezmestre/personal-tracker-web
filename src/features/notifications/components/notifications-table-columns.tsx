'use client';
import { useNotificationMessage } from '../use-notification-message';

import type { Route } from 'next';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/data-table-features';
import type { Doc } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { useSetNotificationRead, useDeleteNotification } from './notifications-table-actions';
import { formatDate, formatTime } from '@/lib/format-date';
const typeVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reminder: 'secondary',
    deadline: 'destructive',
    progress: 'default',
    status: 'outline',
};
interface UseNotificationsTableColumnsProps {
    objectiveMap: Map<string, Doc<'objectives'>>;
    onMutationSuccess?: () => void;
}
export function useNotificationsTableColumns({
    objectiveMap,
    onMutationSuccess,
}: UseNotificationsTableColumnsProps) {
    const message = useNotificationMessage();
    const t = useTranslations('Notifications');
    const locale = useLocale();
    const { setNotificationRead, isSettingRead } = useSetNotificationRead(onMutationSuccess);
    const { deleteNotificationAsync, isDeletingNotification } =
        useDeleteNotification(onMutationSuccess);
    const typeLabels: Record<string, string> = {
        reminder: t('typeOptions.reminder'),
        deadline: t('typeOptions.deadline'),
        progress: t('typeOptions.progress'),
        status: t('typeOptions.status'),
    };
    const columns: ColumnDef<DataTableFeatures, Doc<'notifications'>>[] = [
        {
            accessorKey: 'message',
            header: t('table.columns.message'),
            cell: ({ row }) => {
                const notification = row.original;
                return (
                    <span className={notification.read ? 'text-muted-foreground' : 'font-semibold'}>
                        {message(notification)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'objective',
            header: t('table.columns.objective'),
            cell: ({ row }) => {
                const objectiveId = row.original.objective;
                if (!(typeof objectiveId === 'string')) {
                    return (
                        <span className="text-muted-foreground">{t('table.unknownObjective')}</span>
                    );
                }
                const objective = objectiveMap.get(objectiveId);
                const label = objective ? objective.title : t('table.unknownObjective');
                if (!objective) {
                    return <span className="text-muted-foreground">{label}</span>;
                }
                return (
                    <Link
                        href={`/dashboard/objectives/${objectiveId}` as Route}
                        prefetch={false}
                        className="text-primary hover:underline"
                    >
                        {label}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'notificationType',
            header: t('table.columns.type'),
            cell: ({ row }) => {
                const type = row.original.notificationType;
                const label = typeLabels[type] ?? type;
                const variant = typeVariantMap[type] ?? 'outline';
                return <Badge variant={variant}>{label}</Badge>;
            },
        },
        {
            accessorKey: 'notificationDate',
            header: t('table.columns.date'),
            cell: ({ row }) => {
                return `${formatDate(row.original.notificationDate, locale)} ${formatTime(row.original.notificationDate, locale)}`;
            },
        },
        {
            accessorKey: 'read',
            header: t('table.columns.status'),
            cell: ({ row }) => {
                const isRead = row.original.read;
                return (
                    <Badge variant={isRead ? 'secondary' : 'outline'}>
                        {isRead ? t('table.read') : t('table.unread')}
                    </Badge>
                );
            },
        },
        {
            header: t('table.columns.actions'),
            id: 'actions',
            cell: ({ row }) => {
                const notification = row.original;
                const toggleRead = () => {
                    setNotificationRead({
                        id: notification._id,
                        read: !notification.read,
                    });
                };
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleRead}
                            disabled={isSettingRead}
                            data-testid="notification-mark-read-button"
                        >
                            {notification.read ? t('table.markUnread') : t('table.markRead')}
                        </Button>
                        <DeleteConfirmationDialog
                            onConfirm={async () => {
                                await deleteNotificationAsync({
                                    id: notification._id,
                                });
                            }}
                            title={t('confirm.deleteTitle')}
                            description={t('confirm.deleteDescription')}
                            confirmLabel={t('confirm.deleteConfirm')}
                            cancelLabel={t('confirm.cancel')}
                            isLoading={isDeletingNotification}
                            trigger={
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    data-testid="notification-delete-button"
                                >
                                    {t('table.delete')}
                                </Button>
                            }
                        />
                    </div>
                );
            },
        },
    ];
    return columns;
}
