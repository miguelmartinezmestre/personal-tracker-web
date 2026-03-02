import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import NotificationsLayout from '@/features/notifications/components/notifications-layout';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
  let preloadedNotificationsQuery: Preloaded<typeof api.notifications.getNotificationsByUser>;
  let preloadedObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser>;

  try {
    [preloadedNotificationsQuery, preloadedObjectivesQuery] = await Promise.all([
      preloadAuthQuery(api.notifications.getNotificationsByUser, {
        paginationOpts: { numItems: 20, cursor: null },
      }),
      preloadAuthQuery(api.objectives.getObjectivesByUser, {
        paginationOpts: { numItems: 100, cursor: null },
      }),
    ]);
  } catch (error) {
    console.error(error);
    redirect('/dashboard/home');
  }

  return (
    <NotificationsLayout
      preloadedNotificationsQuery={preloadedNotificationsQuery}
      preloadedObjectivesQuery={preloadedObjectivesQuery}
    />
  );
}
