import AuthenticatedView from "@/components/auth-view";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentUser } from "@/lib/session";
import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { getToken } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@/lib/auth";


export default async function Layout({ children }: { children: React.ReactNode }) {

    try {
        const user = await getCurrentUser();
        console.log("user", user);
    } catch (error) {
        void redirect("/login");
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