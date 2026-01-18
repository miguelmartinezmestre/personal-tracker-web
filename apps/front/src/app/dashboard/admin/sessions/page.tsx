import UserSessionsLayout from '@/features/admin/components/user-sessions/user-sessions-layout';
import { requireAdmin } from '@/features/admin/utils/requiredAdmin';

export default async function AdminSessionsPage() {
    requireAdmin();

    return <UserSessionsLayout />;
}
