'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';
import { authClient } from '@/lib/auth-client';

export function useUserRole() {
    const authUser = useQuery(api.auth.getCurrentUser, {});
    const userRole = useQuery(api.users.getUserRole, {});
    const { data: session } = authClient.useSession();

    const isAdmin = useMemo(() => {
        if (!authUser?._id) return false;

        // 1. Check session role from better-auth
        const sessionRole = session?.user?.role;
        if (
            sessionRole === 'admin' ||
            sessionRole === 'ADMIN' ||
            (Array.isArray(sessionRole) &&
                (sessionRole.includes('admin') || sessionRole.includes('ADMIN')))
        ) {
            return true;
        }

        // 2. Check auth user role
        const authRole = (authUser as any)?.role;
        if (
            authRole === 'admin' ||
            authRole === 'ADMIN' ||
            (Array.isArray(authRole) && (authRole.includes('admin') || authRole.includes('ADMIN')))
        ) {
            return true;
        }

        // 3. Check user role from query
        const role = userRole?.role;
        if (role === 'admin' || role === 'ADMIN') {
            return true;
        }

        return false;
    }, [authUser, userRole, session]);

    const user = useMemo(() => {
        return authUser;
    }, [authUser]);

    const isAuthenticated = useMemo(() => {
        return !!authUser?._id;
    }, [authUser]);

    return {
        user,
        isAdmin,
        isAuthenticated,
        role: userRole?.role || (authUser as any)?.role || session?.user?.role,
    };
}

export function useRequireAuth() {
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
