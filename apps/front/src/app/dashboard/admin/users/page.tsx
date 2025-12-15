import { redirect } from 'next/navigation';

export default function AdminUsersAliasPage() {
    redirect('/dashboard/admin-panel?tab=users');
}
