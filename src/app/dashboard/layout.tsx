import { DashboardLayout } from "@/components/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {

    // await getUser()

    // const queryClient = getQueryClient();

    // prefetch(trpc.user.getAccountDetails.queryOptions({}));

    return (
        <div>
            <DashboardLayout>
                {/* <h1>Dashboard</h1> */}
                {children}
            </DashboardLayout>
        </div>
    )
}