import { AdminLayout as AdminLayoutComponent } from '@/components/admin-layout';
import { AdminLayoutGuard } from '@/components/admin-layout-guard';

// No need to check authentication here - it's already checked in dashboard/layout.tsx
// via AuthenticatedView component. We only need to check admin role.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminLayoutGuard>
            <AdminLayoutComponent>{children}</AdminLayoutComponent>
        </AdminLayoutGuard>
    );
}
