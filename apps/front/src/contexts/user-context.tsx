// 'use client';

// import { createContext, useContext } from 'react';
// // Minimal user shape used across the frontend.
// // We intentionally keep this decoupled from the backend `Doc<'user'>` shape because
// // session-derived users (Better Auth) don't include all Convex document fields.
// export type User = {
//     _id: string;
//     _creationTime: number;
//     email: string;
//     name: string;
//     role?: string | string[];
//     image?: string | null;
// };

// interface UserContextType {
//     user: User;
// }

// const UserContext = createContext<UserContextType | undefined>(undefined);

// export function UserProvider({ children, user }: { children: React.ReactNode; user: User }) {
//     return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
// }

// export function useUser() {
//     const context = useContext(UserContext);
//     if (context === undefined) {
//         throw new Error('useUser must be used within a UserProvider');
//     }
//     return context.user;
// }
