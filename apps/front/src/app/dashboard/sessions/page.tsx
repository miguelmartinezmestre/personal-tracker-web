'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import SessionsTable from '@/components/sessions/sessions-table';

export default function SessionsPage() {
    const t = useTranslations('Sessions');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <Suspense fallback={<div>{t('loading')}</div>}>
                <SessionsTable />
            </Suspense>
        </div>
    );
}
