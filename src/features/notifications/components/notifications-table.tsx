'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/features/table/components/table';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { FunctionReturnType } from 'convex/server';
import { useNotificationsTableColumns } from './notifications-table-columns';
import { useMarkAllNotificationsRead } from './notifications-table-actions';

const DEFAULT_PAGE_SIZE = 20;

type NotificationsResult = FunctionReturnType<typeof api.notifications.getNotificationsByUser>;

interface NotificationsTableProps {
    initialNotifications: NotificationsResult | undefined;
}

export default function NotificationsTable({ initialNotifications }: NotificationsTableProps) {
    const t = useTranslations('Notifications');
    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage, reset } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const isFirstPage = paginationOpts.cursor === null;
    const notifications = useQuery({
        ...convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts,
        }),
        initialData: isFirstPage ? initialNotifications : undefined,
    });
    const notificationsContinueCursor = notifications.data?.continueCursor ?? null;
    const notificationsIsDone = notifications.data?.isDone ?? false;
    const hasNextPage = Boolean(notificationsContinueCursor) && !notificationsIsDone;
    const { markAllRead, isMarkingAllRead } = useMarkAllNotificationsRead(reset);
    const data = useMemo<Doc<'notifications'>[]>(
        () => notifications.data?.page ?? [],
        [notifications.data?.page]
    );
    const objectiveIds = useMemo(
        () =>
            Array.from(
                new Set(
                    data
                        .map(notification => notification.objective)
                        .filter((id): id is Id<'objectives'> => id !== undefined)
                )
            ),
        [data]
    );
    const objectives = useQuery(
        convexQuery(
            api.notifications.getObjectivesForNotifications,
            objectiveIds.length > 0 ? { objectiveIds } : 'skip'
        )
    );
    const objectiveMap = new Map(
        (objectives.data ?? []).map(objective => [objective._id, objective])
    );
    const columns = useNotificationsTableColumns({
        objectiveMap,
        onMutationSuccess: reset,
    });

    const unreadCount = data.filter(notification => !notification.read).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}
                </div>
                <Button
                    variant="outline"
                    onClick={() => markAllRead()}
                    disabled={unreadCount === 0 || isMarkingAllRead}
                    data-testid="notification-mark-all-read-button"
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
                    onNextPage: () => nextPage(notificationsContinueCursor, notificationsIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: notifications.isFetching,
                }}
            />
            {data.length === 0 && !notifications.isLoading && (
                <p className="text-center text-muted-foreground py-6">{t('empty')}</p>
            )}
        </div>
    );
}
