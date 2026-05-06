'use client';

import { useTranslations } from 'next-intl';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import SessionsTable from './sessions-table';
import { Preloaded } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';

type SessionsResult = FunctionReturnType<typeof api.sessions.getSessionsByUser>;

export default function SessionsLayout({
    preloadedSessionsQuery,
}: {
    preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;
}) {
    const t = useTranslations('Sessions');
    const sessions = usePreloadedAuthQuery(preloadedSessionsQuery);

    return (
        <div className="space-y-6" data-testid="sessions-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="sessions-title">
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <SessionsTable initialSessions={(sessions as SessionsResult) ?? undefined} />
        </div>
    );
}
