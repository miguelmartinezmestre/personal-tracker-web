'use client';

import { useTranslations } from 'next-intl';
import { QueryErrorBoundary } from '@/components/query-error-boundary';
import { InvitationsList } from './invitations-list';

export default function InvitationsLayout() {
    const t = useTranslations('Invitations');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <QueryErrorBoundary>
                <InvitationsList />
            </QueryErrorBoundary>
        </div>
    );
}
