'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import NotificationsTable from './notifications-table';
import CreateNotificationFormModal from './notification-form-create-modal';

interface NotificationsLayoutProps {
    preloadedNotificationsQuery: Preloaded<typeof api.notifications.getNotificationsByUser>;
}

export default function NotificationsLayout({
    preloadedNotificationsQuery,
}: NotificationsLayoutProps) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return <NotificationsContent preloadedNotificationsQuery={preloadedNotificationsQuery} />;
}

function NotificationsContent({ preloadedNotificationsQuery }: NotificationsLayoutProps) {
    const t = useTranslations('Notifications');
    const notifications = usePreloadedQuery(preloadedNotificationsQuery);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <CreateNotificationFormModal />
            </div>
            <NotificationsTable initialNotifications={notifications ?? undefined} />
        </div>
    );
}
