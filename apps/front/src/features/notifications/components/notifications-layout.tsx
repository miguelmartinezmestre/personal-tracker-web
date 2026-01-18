'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@repo/backend/convex/_generated/api';
import NotificationsTable from './notifications-table';
import CreateNotificationFormModal from './notification-form-create-modal';

interface NotificationsLayoutProps {
    preloadedNotificationsQuery: Preloaded<typeof api.notifications.getNotificationsByUser>;
    preloadedObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser>;
}

export default function NotificationsLayout({
    preloadedNotificationsQuery,
    preloadedObjectivesQuery,
}: NotificationsLayoutProps) {
    const t = useTranslations('Notifications');
    const notifications = usePreloadedAuthQuery(preloadedNotificationsQuery);
    const objectives = usePreloadedAuthQuery(preloadedObjectivesQuery);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <CreateNotificationFormModal />
            </div>
            <NotificationsTable
                initialNotifications={notifications ?? undefined}
                initialObjectives={objectives ?? undefined}
            />
        </div>
    );
}
