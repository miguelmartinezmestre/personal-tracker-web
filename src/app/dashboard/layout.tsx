"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";


export default function Layout({ children }: { children: React.ReactNode }) {

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