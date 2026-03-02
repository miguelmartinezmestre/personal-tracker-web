import UserSessionsLayout from '@/features/admin/components/user-sessions/user-sessions-layout';
import { isAdmin } from '@/features/auth/current-user';
import { redirect } from 'next/navigation';

export default async function AdminSessionsPage() {
  if (!(await isAdmin())) {
    redirect('/dashboard/home');
  }

  return <UserSessionsLayout />;
}
