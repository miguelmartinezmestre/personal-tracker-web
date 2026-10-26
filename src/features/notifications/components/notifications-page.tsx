'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import {
    Award,
    CalendarClock,
    CheckCircle2,
    Mail,
    MailOpen,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import type { FunctionReturnType } from 'convex/server';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadMorePagination } from '@/components/data-table/components/load-more-pagination';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { notificationText } from '@/features/notifications/lib/notification-message';
import { cn } from '@/lib/utils';

type Notification = FunctionReturnType<typeof api.notifications.listNotifications>['page'][number];

const TYPE_ICONS = {
    deadline: CalendarClock,
    progress: TrendingUp,
    status: CheckCircle2,
    achievement: Award,
} as const;

export default function NotificationsPage() {
    const t = useTranslations('Notifications');
    const tAchievements = useTranslations('Achievements.items');
    const locale = useLocale();
    const notifications = usePaginatedList(api.notifications.listNotifications, {});
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    const setRead = useMutation({
        mutationFn: useConvexMutation(api.notifications.setNotificationRead),
    });

    const markAllRead = useMutation({
        mutationFn: useConvexMutation(api.notifications.markAllNotificationsRead),
    });

    const remove = useMutation({
        mutationFn: useConvexMutation(api.notifications.deleteNotification),
    });

    const text = (notification: Notification) =>
        notificationText(
            notification,
            locale,
            (key, params) => t(`messages.${key}`, params),
            code => (tAchievements.has(`${code}.name`) ? tAchievements(`${code}.name`) : undefined)
        );

    return (
        <div className="w-full max-w-3xl min-w-0 space-y-6" data-testid="notifications-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <Button
                    variant="outline"
                    disabled={markAllRead.isPending || notifications.data.length === 0}
                    onClick={() =>
                        markAllRead.mutate(
                            {},
                            { onSuccess: () => toast.success(t('markedAllRead')) }
                        )
                    }
                    data-testid="notifications-mark-all-read"
                >
                    {t('markAllRead')}
                </Button>
            </div>
            {notifications.isLoading && <Skeleton className="h-40 w-full" />}
            {!notifications.isLoading && notifications.data.length === 0 && (
                <p className="text-muted-foreground" data-testid="notifications-empty">
                    {t('empty')}
                </p>
            )}
            {notifications.data.length > 0 && (
                <ul className="divide-y rounded-md border" data-testid="notifications-list">
                    {notifications.data.map(notification => {
                        const Icon = TYPE_ICONS[notification.type];

                        return (
                            <li
                                key={notification.id}
                                className={cn(
                                    'flex items-start gap-3 px-3 py-3',
                                    !notification.read && 'bg-muted/50'
                                )}
                                data-testid="notification-row"
                                data-read={notification.read}
                            >
                                <Icon
                                    className="text-muted-foreground mt-0.5 size-5 shrink-0"
                                    aria-label={t(`types.${notification.type}`)}
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p
                                        className={cn(
                                            'text-sm',
                                            !notification.read && 'font-medium'
                                        )}
                                    >
                                        {notification.objectiveId ? (
                                            <Link
                                                href={`/dashboard/objectives/${notification.objectiveId}`}
                                                className="hover:underline"
                                            >
                                                {text(notification)}
                                            </Link>
                                        ) : (
                                            text(notification)
                                        )}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {formatDate.format(notification.date)}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={setRead.isPending}
                                    aria-label={notification.read ? t('markUnread') : t('markRead')}
                                    onClick={() =>
                                        setRead.mutate({
                                            id: notification.id,
                                            read: !notification.read,
                                        })
                                    }
                                    data-testid="notification-toggle-read"
                                >
                                    {notification.read ? (
                                        <Mail className="size-4" />
                                    ) : (
                                        <MailOpen className="size-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={remove.isPending}
                                    aria-label={t('delete')}
                                    onClick={() =>
                                        remove.mutate(
                                            { id: notification.id },
                                            { onSuccess: () => toast.success(t('deleted')) }
                                        )
                                    }
                                    data-testid="notification-delete"
                                >
                                    <Trash2 className="text-destructive size-4" />
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <LoadMorePagination pagination={notifications} rowCount={notifications.data.length} />
        </div>
    );
}
