"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "better-convex/auth-client";
import { authClient } from "@/features/auth/auth-client";
import { useRouter } from "next/navigation";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function BetterConvexProvider({ children, token }: { children: React.ReactNode, token: string }) {
  const router = useRouter();

  return (
    <ConvexAuthProvider
      authClient={authClient}
      client={convex}
      initialToken={token}
      onMutationUnauthorized={() => {
        console.log("Mutation unauthorized");
        router.push("/login");
      }}
      onQueryUnauthorized={({ queryName}) => {
        console.log("Query unauthorized", queryName);
        router.push("/login");
      }}
    >
      {children}
    </ConvexAuthProvider>
  );
}