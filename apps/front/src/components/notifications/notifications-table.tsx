'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Doc, Id } from '@repo/backend/convex/_generated/dataModel';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { toast } from 'sonner';
import { DataTable } from '@/components/table';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useServerPagination } from '@/hooks/use-server-pagination';

const DEFAULT_PAGE_SIZE = 20;

const typeVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reminder: 'secondary',
    deadline: 'destructive',
    progress: 'default',
    status: 'outline',
};

export default function NotificationsTable() {
    const t = useTranslations('Notifications');
    const queryClient = useQueryClient();

    // Pagination state
    const { currentPage, cursors, isDone, getPaginationOpts, updateCursor, nextPage, previousPage, goToPage, hasNextPage, hasPreviousPage, reset } =
        useServerPagination(DEFAULT_PAGE_SIZE);

    // Fetch notifications with pagination
    const notifications = useQuery({
        ...convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts: getPaginationOpts(currentPage),
        }),
    });

    // Fetch objectives once (for mapping, doesn't need pagination)
    const objectives = useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
    });

    // Update cursor when data changes
    useEffect(() => {
        if (notifications.data) {
            updateCursor(currentPage, notifications.data.continueCursor, notifications.data.isDone);
        }
    }, [notifications.data, currentPage, updateCursor]);

    const setNotificationRead = useMutation({
        mutationFn: useConvexMutation(api.notifications.setNotificationRead),
        onSuccess: () => {
            reset();
            queryClient.invalidateQueries({
                queryKey: ['notifications'],
            });
            toast.success(t('toast.updated'));
        },
        onError: () => {
            toast.error(t('toast.updateFailed'));
        },
    });

    const deleteNotification = useMutation({
        mutationFn: useConvexMutation(api.notifications.deleteNotification),
        onSuccess: () => {
            reset();
            queryClient.invalidateQueries({
                queryKey: ['notifications'],
            });
            toast.success(t('toast.deleted'));
        },
        onError: () => {
            toast.error(t('toast.deleteFailed'));
        },
    });

    const markAllRead = useMutation({
        mutationFn: useConvexMutation(api.notifications.markAllNotificationsRead),
        onSuccess: () => {
            reset();
            queryClient.invalidateQueries({
                queryKey: ['notifications'],
            });
            toast.success(t('toast.markAll'));
        },
        onError: () => {
            toast.error(t('toast.markAllFailed'));
        },
    });

    const objectiveMap = new Map(
        (objectives.data?.page ?? []).map((objective: Doc<'objectives'>) => [String(objective._id), objective])
    );

    const data = (notifications.data?.page ?? []) as Doc<'notifications'>[];
    const unreadCount = data.filter(notification => !notification.read).length;

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
                    setNotificationRead.mutate({
                        id: notification._id as Id<'notifications'>,
                        read: !notification.read,
                    });
                };

                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleRead}
                            disabled={setNotificationRead.isPending}
                        >
                            {notification.read ? t('table.markUnread') : t('table.markRead')}
                        </Button>
                        <DeleteConfirmationDialog
                            onConfirm={async () => {
                                await deleteNotification.mutateAsync({
                                    id: notification._id as Id<'notifications'>,
                                });
                            }}
                            title={t('confirm.deleteTitle')}
                            description={t('confirm.deleteDescription')}
                            confirmLabel={t('confirm.deleteConfirm')}
                            cancelLabel={t('confirm.cancel')}
                            isLoading={deleteNotification.isPending}
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

    // Calculate total pages (estimate, since we don't know the exact total)
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}
                </div>
                <Button
                    variant="outline"
                    onClick={() => markAllRead.mutate({})}
                    disabled={unreadCount === 0 || markAllRead.isPending}
                >
                    {t('markAllRead')}
                </Button>
            </div>
            <DataTable
                columns={columns}
                data={data}
                isLoading={notifications.isLoading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
                }}
            />
            {data.length === 0 && !notifications.isLoading && (
                <p className="text-center text-muted-foreground py-6">{t('empty')}</p>
            )}
        </div>
    );
}
