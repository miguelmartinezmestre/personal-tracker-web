import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import SessionsLayout from '@/features/sessions/components/sessions-layout';
import { Preloaded } from 'convex/react';
import { redirect } from 'next/navigation';

export default async function SessionsPage() {
    
    let preloadedSessionsQuery: Preloaded<typeof api.sessions.getSessionsByUser>;

    try{
        preloadedSessionsQuery = await preloadAuthQuery(api.sessions.getSessionsByUser, {
            paginationOpts: { numItems: 20, cursor: null },
        });
    }catch(error){
        console.error(error);
        redirect('/dashboard/home');
    }

    return <SessionsLayout preloadedSessionsQuery={preloadedSessionsQuery} />;
}
