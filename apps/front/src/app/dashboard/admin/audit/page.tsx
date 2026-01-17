import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';
import AdminAuditLayout from '@/features/admin/components/audit-logs-layout';

export default async function AdminAuditPage() {
    const preloadedAuditLogsQuery = await preloadAuthQuery(api.auditLogs.getAuditLogs, {});

    return <AdminAuditLayout preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}
