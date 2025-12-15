import { redirect } from 'next/navigation';

export default function AdminAuditAliasPage() {
    redirect('/dashboard/admin-panel?tab=audit');
}
