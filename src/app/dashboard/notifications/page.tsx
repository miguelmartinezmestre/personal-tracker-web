import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { NotificationsLayout } from '@/features/notifications';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
    let preloadedNotificationsQuery: Preloaded<typeof api.notifications.getNotificationsByUser>;

    try {
        preloadedNotificationsQuery = await preloadAuthQuery(
            api.notifications.getNotificationsByUser,
            {
                paginationOpts: { numItems: 20, cursor: null },
            }
        );
    } catch {
        redirect('/dashboard/home');
    }

    return <NotificationsLayout preloadedNotificationsQuery={preloadedNotificationsQuery} />;
}
