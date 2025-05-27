import { DashboardLayout } from "@/components/dashboard-layout";
import { getQueryClient, prefetch, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function Layout({ children }: { children: React.ReactNode }) {

    const queryClient = getQueryClient();

    prefetch(trpc.user.getAccountDetails.queryOptions({}));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DashboardLayout>
                {/* <h1>Dashboard</h1> */}
                {children}
            </DashboardLayout>
        </HydrationBoundary>
    )
}