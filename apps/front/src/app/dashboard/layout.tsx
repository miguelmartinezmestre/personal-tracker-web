import AuthenticatedView from '@/components/auth-view';
import { DashboardLayout } from '@/components/dashboard-layout';
import { NextStepWrapper, TourProvider } from '@/components/tours';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedView>
            <NextStepWrapper>
                <TourProvider>
                    <DashboardLayout>{children}</DashboardLayout>
                </TourProvider>
            </NextStepWrapper>
        </AuthenticatedView>
    );
}
