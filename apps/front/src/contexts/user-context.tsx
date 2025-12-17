'use client';

import { createContext, useContext } from 'react';
// import { api } from "@repo/backend/convex/_generated/api";
import type { Doc } from '@repo/backend/convex/_generated/dataModel';

// getCurrentUser returns Doc<"user"> | null
type User = Doc<'user'>;

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
        throw new Error('useUser must be used within a UserProvider');
    }
    return context.user;
}
