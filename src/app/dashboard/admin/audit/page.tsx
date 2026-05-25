import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { AdminAuditLayout } from '@/features/admin';
import { isAdmin } from '@/features/auth/server';
import { redirect } from 'next/navigation';

export default async function AdminAuditPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    const preloadedAuditLogsQuery = await preloadAuthQuery(api.auditLogs.getAuditLogs, {
        paginationOpts: { numItems: 20, cursor: null },
    });

    return <AdminAuditLayout preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}
