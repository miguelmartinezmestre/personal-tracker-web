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
    const lastUnreadRef = useRef<number>(0);
    const lastIdsRef = useRef<Set<string>>(new Set());

    const unreadCountValue = unreadCount?.count ?? 0;
    const notifications = data?.page ?? [];

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            lastUnreadRef.current = unreadCountValue;
            notifications.forEach(n => lastIdsRef.current.add(n._id));
            return;
        }

        if (unreadCountValue > lastUnreadRef.current) {
            const newUnread = notifications.filter(n => !n.read && !lastIdsRef.current.has(n._id));
            for (const notification of newUnread.slice(0, 3)) {
                toast.info(notification.message);
                lastIdsRef.current.add(notification._id);
            }
        }

        lastUnreadRef.current = unreadCountValue;
        notifications.forEach(n => lastIdsRef.current.add(n._id));
    }, [unreadCountValue, notifications]);

    return null;
}
