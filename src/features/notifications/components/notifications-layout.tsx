'use client';

import { useTranslations } from 'next-intl';
import { useConvexAuth } from 'convex/react';
import NotificationsTable from './notifications-table';
import CreateNotificationFormModal from './notification-form-create-modal';

export default function NotificationsLayout() {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const t = useTranslations('Notifications');

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <CreateNotificationFormModal />
            </div>
            <NotificationsTable />
        </div>
    );
}
