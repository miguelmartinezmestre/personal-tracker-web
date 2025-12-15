// Simplified auth for route protection
// This avoids complex Convex context issues in Next.js layouts

export interface Session {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string | string[];
    };
}

export const getServerAuth = () => {
    // For now, return a mock auth implementation
    // In production, this would decode actual session tokens
    return {
        api: {
            getSession: async () => {
                // This is where you would verify JWT/session cookies
                // For now returning null to let client-side auth handle verification
                return null;
            },
        },
    };
};

// For server-side usage where we need tokens
export const getToken = async () => {
    // In production, this would extract token from cookies or headers
    // For now, return null to avoid token issues
    return null;
};
