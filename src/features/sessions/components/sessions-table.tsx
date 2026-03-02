'use client';

import { DataTable } from '@/features/table/components/table';
import { useSessionsTableColumns } from './sessions-table-columns';
import { Doc } from '@/convex/_generated/dataModel';

export default function SessionsTable({
  sessions,
}: {
  sessions: {
    currentSession: Doc<'session'> | undefined;
    sessions: Doc<'session'>[] | undefined;
  };
}) {
  const columns = useSessionsTableColumns({
    currentSessionToken: sessions.currentSession?.token,
  });

  return (
    <div>
      <DataTable columns={columns} data={sessions.sessions ?? []} />
    </div>
  );
}
