'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@repo/backend/convex/_generated/api';
import SessionsTable from './sessions-table';

interface SessionsLayoutProps {
    preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;
}

export default function SessionsLayout({ preloadedSessionsQuery }: SessionsLayoutProps) {
    const t = useTranslations('Sessions');
    const sessions = usePreloadedAuthQuery(preloadedSessionsQuery);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <SessionsTable initialSessions={sessions ?? undefined} />
        </div>
    );
}
