import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { AdminAuditLayout } from '@/features/admin';
import { isAdmin } from '@/features/auth/server';
import { redirect } from 'next/navigation';
import { DEFAULT_PAGINATION_OPTS } from '@/lib/pagination';

export default async function AdminAuditPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    const preloadedAuditLogsQuery = await preloadAuthQuery(api.auditLogs.getAuditLogs, {
        paginationOpts: DEFAULT_PAGINATION_OPTS,
    });

    return <AdminAuditLayout preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}
