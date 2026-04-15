'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/features/table/components/table';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { FunctionReturnType } from 'convex/server';
import { useNotificationsTableColumns } from './notifications-table-columns';
import { useMarkAllNotificationsRead } from './notifications-table-actions';

const DEFAULT_PAGE_SIZE = 20;

type NotificationsResult = FunctionReturnType<typeof api.notifications.getNotificationsByUser>;
type ObjectivesResult = FunctionReturnType<typeof api.objectives.getObjectivesByUser>;

interface NotificationsTableProps {
    initialNotifications: NotificationsResult | undefined;
    initialObjectives: ObjectivesResult | undefined;
}

export default function NotificationsTable({
    initialNotifications,
    initialObjectives,
}: NotificationsTableProps) {
    const t = useTranslations('Notifications');
    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
        reset,
    } = useServerPagination(DEFAULT_PAGE_SIZE);
    const paginationOpts = getPaginationOpts(currentPage);
    const isFirstPage = paginationOpts.cursor === null;
    const notifications = useQuery({
        ...convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts,
        }),
        initialData: isFirstPage ? initialNotifications : undefined,
    });
    const objectives = useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
        initialData: initialObjectives,
    });
    const hasNotificationsData = notifications.data !== undefined;
    const notificationsContinueCursor = notifications.data?.continueCursor ?? null;
    const notificationsIsDone = notifications.data?.isDone ?? false;
    useEffect(() => {
        if (!hasNotificationsData || notifications.isFetching) {
            return;
        }

        updateCursor(currentPage, notificationsContinueCursor, notificationsIsDone);
    }, [
        currentPage,
        hasNotificationsData,
        notificationsContinueCursor,
        notificationsIsDone,
        notifications.isFetching,
        updateCursor,
    ]);
    const { markAllRead, isMarkingAllRead } = useMarkAllNotificationsRead(reset);
    const objectivesPage: Doc<'objectives'>[] = objectives.data?.page ?? [];
    const objectiveMap = new Map(
        objectivesPage.map(objective => [objective._id, objective])
    );
    const columns = useNotificationsTableColumns({
        objectiveMap,
        onMutationSuccess: reset,
    });

    const data: Doc<'notifications'>[] = notifications.data?.page ?? [];
    const unreadCount = data.filter(notification => !notification.read).length;

    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

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
