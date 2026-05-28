'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

export function NotificationSonnerListener() {
    const { data: unreadCount } = useQuery(
        convexQuery(api.notifications.getUnreadNotificationCount, {})
    );

    const { data } = useQuery(
        convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 20, cursor: null },
        })
    );

    const initializedRef = useRef(false);
    const previousUnreadCountRef = useRef<number>(0);
    const seenNotificationIdsRef = useRef<Set<string>>(new Set());

    const unreadCountValue = unreadCount?.count ?? 0;
    const notificationPage = data?.page;

    useEffect(() => {
        const notifications = notificationPage ?? [];

        if (!initializedRef.current) {
            initializedRef.current = true;
            previousUnreadCountRef.current = unreadCountValue;
            notifications.forEach(notification =>
                seenNotificationIdsRef.current.add(notification._id)
            );
            return;
        }

        if (unreadCountValue > previousUnreadCountRef.current) {
            const newUnreadNotifications = notifications.filter(
                notification =>
                    !notification.read && !seenNotificationIdsRef.current.has(notification._id)
            );
            for (const notification of newUnreadNotifications.slice(0, 3)) {
                toast.info(notification.message);
                seenNotificationIdsRef.current.add(notification._id);
            }
        }

        previousUnreadCountRef.current = unreadCountValue;
        notifications.forEach(notification => seenNotificationIdsRef.current.add(notification._id));
    }, [unreadCountValue, notificationPage]);

    return null;
}
