import { UserSessionsLayout } from '@/features/admin';
import { isAdmin } from '@/features/auth/server';
import { redirect } from 'next/navigation';

export default async function AdminSessionsPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    return <UserSessionsLayout />;
}
