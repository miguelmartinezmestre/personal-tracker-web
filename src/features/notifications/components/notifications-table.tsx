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

    // Pagination state
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

    // Fetch notifications with pagination (use initial data for first page)
    const paginationOpts = getPaginationOpts(currentPage);
    const isFirstPage = paginationOpts.cursor === null;
    const notifications = useQuery({
        ...convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts,
        }),
        initialData: isFirstPage ? initialNotifications : undefined,
    });

    // Fetch objectives once (for mapping, doesn't need pagination)
    const objectives = useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
        initialData: initialObjectives,
    });
    const hasNotificationsData = notifications.data !== undefined;
    const notificationsContinueCursor = notifications.data?.continueCursor ?? null;
    const notificationsIsDone = notifications.data?.isDone ?? false;

    // Update cursor when data changes
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

    // Actions
    const { markAllRead, isMarkingAllRead } = useMarkAllNotificationsRead(reset);

    // Build objective map for columns
    const objectiveMap = new Map(
        (objectives.data?.page ?? []).map((objective: Doc<'objectives'>) => [
            String(objective._id),
            objective,
        ])
    );

    // Columns
    const columns = useNotificationsTableColumns({
        objectiveMap: objectiveMap as Map<string, Doc<'objectives'>>,
        onMutationSuccess: reset,
    });

    const data = (notifications.data?.page ?? []) as Doc<'notifications'>[];
    const unreadCount = data.filter(notification => !notification.read).length;

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
                    onClick={() => markAllRead()}
                    disabled={unreadCount === 0 || isMarkingAllRead}
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
