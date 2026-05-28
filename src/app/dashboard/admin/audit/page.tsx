import { AdminAuditLayout } from '@/features/admin';
import { isAdmin } from '@/features/auth/server';
import { redirect } from 'next/navigation';

export default async function AdminAuditPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    return <AdminAuditLayout />;
}
