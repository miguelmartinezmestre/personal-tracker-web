'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { InvitationsList } from './invitations-list';

export default function InvitationsLayout() {
    const t = useTranslations('Invitations');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <Suspense fallback={<div className="text-center py-8">{t('loading')}</div>}>
                <InvitationsList />
            </Suspense>
        </div>
    );
}
