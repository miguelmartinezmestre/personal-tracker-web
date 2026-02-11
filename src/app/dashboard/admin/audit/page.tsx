import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import AdminAuditLayout from '@/features/admin/components/audit-logs/audit-logs-layout';
import { isAdmin } from '@/features/auth/current-user';
import { redirect } from 'next/navigation';

export default async function AdminAuditPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    const preloadedAuditLogsQuery = await preloadAuthQuery(api.auditLogs.getAuditLogs, {});

    return <AdminAuditLayout preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}
