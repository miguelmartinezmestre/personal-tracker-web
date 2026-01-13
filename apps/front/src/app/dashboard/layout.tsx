import AuthenticatedView from '@/components/auth-view';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TourProvider } from '@/components/tours';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedView>
            <TourProvider>
                <DashboardLayout>{children}</DashboardLayout>
            </TourProvider>
        </AuthenticatedView>
    );
}
