'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/components/table';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { useNotificationsTableColumns } from './notifications-table-columns';
import { useMarkAllNotificationsRead } from './notifications-table-actions';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export default function NotificationsTable() {
    const t = useTranslations('Notifications');
    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage, reset } =
        useServerPagination(DEFAULT_PAGE_SIZE);
    const notifications = useQuery(
        convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts,
        })
    );
    const notificationsContinueCursor = notifications.data?.continueCursor ?? null;
    const notificationsIsDone = notifications.data?.isDone ?? false;
    const hasNextPage = Boolean(notificationsContinueCursor) && !notificationsIsDone;
    const { markAllRead, isMarkingAllRead } = useMarkAllNotificationsRead(reset);
    const tableNotifications: Doc<'notifications'>[] = notifications.data?.page ?? [];
    const objectiveIds = Array.from(
        new Set(
            tableNotifications
                .map(notification => notification.objective)
                .filter((objectiveId): objectiveId is Id<'objectives'> => objectiveId !== undefined)
        )
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

    const unreadCount = tableNotifications.filter(notification => !notification.read).length;

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
                data={tableNotifications}
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
            {tableNotifications.length === 0 && !notifications.isLoading && (
                <p className="text-center text-muted-foreground py-6">{t('empty')}</p>
            )}
        </div>
    );
}
