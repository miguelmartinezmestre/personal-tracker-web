import { DashboardLayout } from "@/components/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {

    return (
        <DashboardLayout>
            {/* <h1>Dashboard</h1> */}
            {children}
        </DashboardLayout>
    )
}