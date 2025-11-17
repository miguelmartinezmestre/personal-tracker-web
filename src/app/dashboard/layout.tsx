import AuthenticatedView from "@/components/auth-view";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
    try {
        await getCurrentUser();
    } catch (error) {
        redirect("/login");
    }

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