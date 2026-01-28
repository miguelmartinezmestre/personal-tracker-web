'use client';

import { DataTable } from '@/features/table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/auth-client';
import { FunctionReturnType } from 'convex/server';
import { useSessionsTableColumns } from './sessions-table-columns';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
};

type SessionsResult = FunctionReturnType<typeof api.sessions.getSessionsByUser>;

interface SessionsTableProps {
    initialSessions: SessionsResult | undefined;
}

export default function SessionsTable({ initialSessions }: SessionsTableProps) {
    const sessions = useQuery({
        ...convexQuery(api.sessions.getSessionsByUser, DEFAULT_PAGINATION_OPTS),
        initialData: initialSessions,
    });

    // Get current session to prevent revoking it
    const currentSession = authClient.useSession();
    const currentSessionToken = currentSession.data?.session?.token;

    // Columns
    const columns = useSessionsTableColumns({ currentSessionToken });

    return (
        <div>
            <DataTable
                columns={columns}
                data={sessions.data ?? []}
                isLoading={sessions.isLoading}
            />
        </div>
    );
}
