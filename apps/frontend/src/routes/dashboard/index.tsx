import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DashboardLayout } from '../../components/dashboard-layout';
import useAuth from '../../hooks/useAuth';

export const Route = createFileRoute('/dashboard/')({
    component: RouteComponent,
});

function RouteComponent() {
    const auth = useAuth();

    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    );
}
