'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export function NotificationSonnerListener() {
    const { data } = useQuery(
        convexQuery(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: DEFAULT_PAGE_SIZE, cursor: null },
        })
    );

    const previousNotificationsRef = useRef<Set<string>>(new Set());

    const notificationPage = data?.page;

    useEffect(() => {
        if (!notificationPage) return;
        const currentIds = new Set(notificationPage.map(notification => notification._id));
        const previousIds = previousNotificationsRef.current;

        const newNotifications = notificationPage.filter(
            notification => !previousIds.has(notification._id)
        );
        newNotifications.slice(0, 3).forEach(notification => toast.info(notification.message));

        previousNotificationsRef.current = currentIds;
    }, [notificationPage]);

    return null;
}
