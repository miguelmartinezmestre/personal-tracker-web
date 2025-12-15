import { redirect } from 'next/navigation';

export default function AdminSessionsAliasPage() {
    redirect('/dashboard/admin-panel?tab=sessions');
}
