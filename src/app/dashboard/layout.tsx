import { DashboardLayout } from "@/components/dashboard-layout";
import { cookies } from "next/headers";

export default async function Layout({ children }: { children: React.ReactNode }) {

    const cookieStore = await cookies();

    const token = cookieStore.get('token');

    return (
        <DashboardLayout>
            <h1>Dashboard</h1>
            {children}
        </DashboardLayout>
    )
}