'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

interface NotificationSonnerListenerProps {
    organizationId: string | null;
}

export function NotificationSonnerListener({ organizationId }: NotificationSonnerListenerProps) {
    const { data: overview } = useQuery(convexQuery(api.notifications.getNotificationOverview, {}));

    const scopeRef = useRef<string | null | undefined>(undefined);
    const latestCreationTimeRef = useRef(0);

    const notificationPage = overview?.notifications;

    useEffect(() => {
        if (!notificationPage) return;
        const latestCreationTime = notificationPage.reduce(
            (latest, notification) => Math.max(latest, notification._creationTime),
            0
        );

        // Initial data and a tenant switch are history, not new delivery.
        // A time watermark also prevents older rows re-entering the top page
        // after deletions from being announced as fresh notifications.
        if (scopeRef.current !== organizationId) {
            scopeRef.current = organizationId;
            latestCreationTimeRef.current = latestCreationTime;
            return;
        }

        const newNotifications = notificationPage.filter(
            notification => notification._creationTime > latestCreationTimeRef.current
        );
        newNotifications.slice(0, 3).forEach(notification => toast.info(notification.message));

        latestCreationTimeRef.current = Math.max(latestCreationTimeRef.current, latestCreationTime);
    }, [notificationPage, organizationId]);

    return null;
}
