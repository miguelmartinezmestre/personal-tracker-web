'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';

// Helper to check if a role is admin
function isAdminRole(role: string | string[] | undefined): boolean {
    if (!role) return false;
    if (role === 'admin' || role === 'ADMIN') return true;
    if (Array.isArray(role)) {
        return role.includes('admin') || role.includes('ADMIN');
    }
    return false;
}

export function useUserRole() {
    // Try to use user from context first (available when inside AuthenticatedView)
    // This avoids redundant queries when user is already available
    let contextUser: ReturnType<typeof useUser> | null = null;
    try {
        contextUser = useUser();
    } catch {
        // User context not available, will fall back to queries
    }

    // Only query if context user is not available
    const authUser = useQuery(
        api.auth.getCurrentUser,
        contextUser ? 'skip' : {}
    );
    const userRole = useQuery(
        api.users.getUserRole,
        contextUser ? 'skip' : {}
    );
    const { data: session } = authClient.useSession();

    // Use context user if available, otherwise use queried user
    const user = contextUser ?? authUser ?? null;

    const isAdmin = useMemo(() => {
        if (!user?._id) return false;

        // 1. Check user role from context/query
        const userRoleValue = (user as { role?: string | string[] })?.role;
        if (isAdminRole(userRoleValue)) {
            return true;
        }

        // 2. Check user role from separate query (fallback)
        if (userRole?.role && isAdminRole(userRole.role)) {
            return true;
        }

        // 3. Check session role from better-auth (fallback)
        const sessionRole = session?.user?.role;
        if (isAdminRole(sessionRole)) {
            return true;
        }

        return false;
    }, [user, userRole, session]);

    const isAuthenticated = useMemo(() => {
        return !!user?._id;
    }, [user]);

    return {
        user,
        isAdmin,
        isAuthenticated,
        role:
            (user as { role?: string | string[] })?.role ||
            userRole?.role ||
            session?.user?.role,
    };
}

export function useRequireAuth() {
    // Try to use user from context first (more efficient)
    let contextUser: ReturnType<typeof useUser> | null = null;
    try {
        contextUser = useUser();
    } catch {
        // User context not available, will fall back to useUserRole
    }

    // If context user is available, use it directly (no queries needed)
    if (contextUser) {
        return { user: contextUser, isAuthenticated: true };
    }

    // Fallback to useUserRole if context is not available
    const { isAuthenticated, user } = useUserRole();

    if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
    }

    return { user, isAuthenticated };
}

export function useRequireAdmin() {
    const { isAdmin, user, isAuthenticated } = useUserRole();

    if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
    }

    if (!isAdmin) {
        throw new Error('Admin access required');
    }

    return { user, isAdmin, isAuthenticated };
}
