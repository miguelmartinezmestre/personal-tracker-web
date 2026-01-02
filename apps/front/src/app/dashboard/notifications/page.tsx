'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import NotificationsTable from '@/components/notifications/notifications-table';
import CreateNotificationFormModal from '@/components/notifications/notification-form-create-modal';

export default function NotificationsPage() {
    const t = useTranslations('Notifications');

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <CreateNotificationFormModal />
            </div>
            <Suspense fallback={<div>{t('loading')}</div>}>
                <NotificationsTable />
            </Suspense>
        </div>
    );
}
