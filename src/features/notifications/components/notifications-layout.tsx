'use client';

import { useTranslations } from 'next-intl';
import { useConvexAuth } from 'convex/react';
import NotificationsTable from './notifications-table';

export default function NotificationsLayout() {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const t = useTranslations('Notifications');

    if (authLoading || !isAuthenticated) {
        return null;
    }

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <NotificationsTable />
        </div>
    );
}
