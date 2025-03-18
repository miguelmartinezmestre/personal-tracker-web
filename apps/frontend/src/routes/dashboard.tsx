import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { DashboardLayout } from '../components/dashboard-layout';
import useAuth from '../hooks/useAuth';
import { AuthProvider } from '../providers/auth-provider';

export const Route = createFileRoute('/dashboard')({
    component: RouteComponent,
    beforeLoad: async ({ context }) => {
        console.log(context);
        console.log('Test');
    },
});

function RouteComponent() {
    const { email, name, id, isLoading } = useAuth();
    const navigate = useNavigate();
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Cargando...</div>;
    }

    if (email === '' || name === '' || id === 0) {
        navigate({ to: '/' });
    }

    return (
        <AuthProvider value={{ user: { email, name, id }, isLoading }}>
            <DashboardLayout>
                <Outlet />
            </DashboardLayout>
        </AuthProvider>
    );
}
