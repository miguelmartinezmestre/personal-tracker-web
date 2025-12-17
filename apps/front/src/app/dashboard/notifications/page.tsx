'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

export default function NotificationsPage() {
    const t = useTranslations('Notifications');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <Suspense fallback={<div>{t('loading')}</div>}>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('empty')}</p>
                </div>
            </Suspense>
        </div>
    );
}
