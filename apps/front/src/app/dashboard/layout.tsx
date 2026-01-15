import { DashboardLayout } from '@/features/dashboard/dashboard-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout>{children}</DashboardLayout>
    );
}
