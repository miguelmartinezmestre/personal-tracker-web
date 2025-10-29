"use client";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";

export default function AuthenticatedView({ children }: { children: React.ReactNode }) {

    return (
        <>
            <AuthLoading>
                <div className="flex justify-center items-center h-screen">
                    <div>Loading...</div>
                </div>
            </AuthLoading>
            <Unauthenticated>

                {/* <div className="flex justify-center items-center h-screen">
                    
                </div>  */}


                <div className="flex flex-col min-h-screen">
                    {/* <Header /> */}
                    <div className="flex-grow flex items-center justify-center p-6">
                        <div className="w-full max-w-md rounded-xl shadow-lg p-8">
                            {/* <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                                {t('login')}
                            </h1> */}
                            {/* <LoginForm /> */}
                            <Link href="/login" className="font-bold">
                                <Alert variant="destructive">
                                    <AlertCircleIcon />
                                    <AlertTitle>Not Authenticated</AlertTitle>
                                    <AlertDescription>
                                        {/* <p>Error while verify your auth</p>
                                    <ul className="list-inside list-disc text-sm">
                                        <li>Check your card details</li>
                                        <li>Ensure sufficient funds</li>
                                        <li>Verify billing address</li>
                                    </ul> */}
                                        Please click to go back to login page
                                    </AlertDescription>
                                </Alert>
                            </Link>
                        </div>
                    </div>
                    {/* <Footer /> */}
                </div>

            </Unauthenticated>
            <Authenticated>
                {children}
            </Authenticated>
        </>
    )
}