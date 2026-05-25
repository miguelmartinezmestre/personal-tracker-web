'use client';

import { useTranslations } from 'next-intl';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import SessionsTable from './sessions-table';
import { Preloaded } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';
import { Skeleton } from '@/components/ui/skeleton';

type SessionsResult = FunctionReturnType<typeof api.sessions.getSessionsByUser>;

export default function SessionsLayout({
    preloadedSessionsQuery,
}: {
    preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;
}) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading || !isAuthenticated) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="mt-2 h-5 w-96" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return <SessionsContent preloadedSessionsQuery={preloadedSessionsQuery} />;
}

function SessionsContent({
    preloadedSessionsQuery,
}: {
    preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;
}) {
    const t = useTranslations('Sessions');
    const preloadedSessions = usePreloadedQuery(preloadedSessionsQuery);

    return (
        <div className="space-y-6" data-testid="sessions-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="sessions-title">
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <SessionsTable initialSessions={(preloadedSessions as SessionsResult) ?? undefined} />
        </div>
    );
}
