import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { SessionsLayout } from '@/features/sessions';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

export default async function SessionsPage() {
    let preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;

    try {
        preloadedSessionsQuery = await preloadAuthQuery(api.sessions.getSessionsByUser, {
            paginationOpts: DEFAULT_PAGINATION_OPTS,
        });
    } catch {
        redirect('/dashboard/home');
    }

    return <SessionsLayout preloadedSessionsQuery={preloadedSessionsQuery} />;
}
