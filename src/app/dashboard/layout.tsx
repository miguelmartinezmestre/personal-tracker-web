import AuthenticatedView from "@/components/auth-view";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";


export default async function Layout({ children }: { children: React.ReactNode }) {

    try {
        const user = await getCurrentUser();
        console.log("user", user);
    } catch (error) {
        void redirect("/login");
    }

    return (
        <div>
            <DashboardLayout>
                <AuthenticatedView>
                    <h1>Dashboard</h1>
                    {children}
                </AuthenticatedView>
            </DashboardLayout>
        </div>
    )
}