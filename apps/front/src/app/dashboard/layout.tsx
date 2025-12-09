import AuthenticatedView from "@/components/auth-view";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedView>
            <DashboardLayout>
                {children}
            </DashboardLayout>
        </AuthenticatedView>
    )
}