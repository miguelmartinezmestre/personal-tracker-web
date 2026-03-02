'use client';

import { useTranslations } from 'next-intl';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import SessionsTable from './sessions-table';
import { Preloaded } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function SessionsLayout({
    preloadedSessionsQuery,
}: {
    preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;
}) {
    const t = useTranslations('Sessions');
    const sessions = usePreloadedAuthQuery(preloadedSessionsQuery);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <SessionsTable
                sessions={{
                    currentSession: sessions?.currentSession ?? undefined,
                    sessions: sessions?.sessions,
                }}
            />
        </div>
    );
}
