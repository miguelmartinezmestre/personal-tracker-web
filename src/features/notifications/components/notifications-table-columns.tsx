'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import { useSetNotificationRead, useDeleteNotification } from './notifications-table-actions';

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
  const t = useTranslations('Notifications');

  const { setNotificationRead, isSettingRead } = useSetNotificationRead(onMutationSuccess);
  const { deleteNotificationAsync, isDeletingNotification } =
    useDeleteNotification(onMutationSuccess);

  const typeLabels: Record<string, string> = {
    reminder: t('typeOptions.reminder'),
    deadline: t('typeOptions.deadline'),
    progress: t('typeOptions.progress'),
    status: t('typeOptions.status'),
  };

  const columns: ColumnDef<Doc<'notifications'>>[] = [
    {
      accessorKey: 'message',
      header: t('table.columns.message'),
      cell: ({ row }) => {
        const notification = row.original;
        return (
          <span className={notification.read ? 'text-muted-foreground' : 'font-semibold'}>
            {notification.message}
          </span>
        );
      },
    },
    {
      accessorKey: 'objective',
      header: t('table.columns.objective'),
      cell: ({ row }) => {
        const objective = objectiveMap.get(String(row.original.objective));
        const label = objective?.title ?? t('table.unknownObjective');
        return objective ? (
          <Link
            href={`/dashboard/objectives/${String(row.original.objective)}`}
            prefetch={false}
            className="text-primary hover:underline"
          >
            {label}
          </Link>
        ) : (
          <span className="text-muted-foreground">{label}</span>
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
        return format(new Date(row.original.notificationDate), 'PPp');
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
            id: notification._id as Id<'notifications'>,
            read: !notification.read,
          });
        };

        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleRead} disabled={isSettingRead}>
              {notification.read ? t('table.markUnread') : t('table.markRead')}
            </Button>
            <DeleteConfirmationDialog
              onConfirm={async () => {
                await deleteNotificationAsync({
                  id: notification._id as Id<'notifications'>,
                });
              }}
              title={t('confirm.deleteTitle')}
              description={t('confirm.deleteDescription')}
              confirmLabel={t('confirm.deleteConfirm')}
              cancelLabel={t('confirm.cancel')}
              isLoading={isDeletingNotification}
              trigger={
                <Button variant="destructive" size="sm">
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
