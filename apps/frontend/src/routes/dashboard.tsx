import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DashboardLayout } from '../components/dashboard-layout';
import useAuth from '../hooks/useAuth';
import { createContext } from 'react';

export const Route = createFileRoute('/dashboard')({
    component: RouteComponent,
});

function RouteComponent() {
    const auth = useAuth();

    // const context = createContext();

    //add context

    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    );
}
