import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';
import AdminAuditLayout from '@/features/admin/components/audit-logs/audit-logs-layout';
import { requireAdmin } from '@/features/admin/utils/requiredAdmin';

export default async function AdminAuditPage() {
    requireAdmin();
    const preloadedAuditLogsQuery = await preloadAuthQuery(api.auditLogs.getAuditLogs, {});

    return <AdminAuditLayout preloadedAuditLogsQuery={preloadedAuditLogsQuery} />;
}
