"use client";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export default function AuthenticatedView({ children }: { children: React.ReactNode }) {

    return (
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
    )
}