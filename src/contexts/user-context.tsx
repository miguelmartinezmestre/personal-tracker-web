"use client";

import { createContext, useContext } from "react";
import { api } from "../../convex/_generated/api";

type User = NonNullable<Awaited<ReturnType<typeof api.auth.getCurrentUser>>>;

interface UserContextType {
    user: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children, user }: { children: React.ReactNode; user: User }) {
    return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context.user;
}

