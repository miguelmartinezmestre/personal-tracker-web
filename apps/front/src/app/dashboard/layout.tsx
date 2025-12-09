import AuthenticatedView from "@/components/auth-view";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <AuthenticatedView>
                <DashboardLayout>
                    <h1>Dashboard</h1>
                    {children}
                </DashboardLayout>
            </AuthenticatedView>
        </div>
    )
}