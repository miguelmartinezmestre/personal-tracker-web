import { DashboardLayout } from "@/components/dashboard-layout";
import { cookies } from "next/headers";

export default async function Layout({ children }: { children: React.ReactNode }) {

    console.log("layout dashboard")

    const cookieStore = await cookies();

    const token = cookieStore.get('token');

    return (
        <DashboardLayout>
            <h1>Dashboard</h1>
            {token?.value}
            {children}
        </DashboardLayout>
    )
}