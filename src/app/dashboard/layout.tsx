"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { authClient } from "@/lib/auth-client";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";


export default function Layout({ children }: { children: React.ReactNode }) {

    // await getUser()

    // const queryClient = getQueryClient();

    // prefetch(trpc.user.getAccountDetails.queryOptions({}));

    return (
        <div>
            <DashboardLayout>
                {/* <h1>Dashboard</h1> */}
                <>
                    <AuthLoading>
                        <div>Loading...</div>
                    </AuthLoading>
                    <Unauthenticated>
                        Not Authenticated
                    </Unauthenticated>
                    <Authenticated>
                        {children}
                    </Authenticated>
                </>

            </DashboardLayout>
        </div>
    )
}