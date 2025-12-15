// Simple auth utilities for route protection
// This is a placeholder implementation that will be enhanced

export interface Session {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string | string[];
    };
}

export interface AuthResult {
    success: boolean;
    session: Session | null;
    error?: string;
}

// Mock auth implementation for development
// In production, this would verify actual tokens
export async function verifySession(): Promise<AuthResult> {
    // This is a simplified check
    // Real implementation would decode JWT or verify session cookies
    return {
        success: true,
        session: {
            user: {
                id: 'mock-user',
                email: 'user@example.com',
                name: 'Mock User',
                role: 'user',
            },
        },
    };
}

export async function verifyAdminSession(): Promise<AuthResult> {
    const result = await verifySession();

    if (!result.success || !result.session) {
        return { success: false, session: null, error: 'Not authenticated' };
    }

    const userRole = result.session.user.role;
    const isAdmin =
        userRole === 'admin' ||
        userRole === 'ADMIN' ||
        (Array.isArray(userRole) && (userRole.includes('admin') || userRole.includes('ADMIN')));

    if (!isAdmin) {
        return { success: false, session: null, error: 'Admin access required' };
    }

    return result;
}
