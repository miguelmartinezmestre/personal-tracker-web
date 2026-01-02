import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('auth-verify', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('verifySession returns a successful session', async () => {
        const { verifySession } = await import('./auth-verify');

        const result = await verifySession();

        expect(result.success).toBe(true);
        expect(result.session).not.toBeNull();
        expect(result.session?.user).toMatchObject({
            id: 'mock-user',
            email: 'user@example.com',
            name: 'Mock User',
            role: 'user',
        });
    });

    it('verifyAdminSession rejects non-admin users', async () => {
        const auth = await import('./auth-verify');

        const result = await auth.verifyAdminSession();

        expect(result.success).toBe(false);
        expect(result.session).toBeNull();
        expect(result.error).toBe('Admin access required');
    });

    it('verifyAdminSession rejects unauthenticated users', async () => {
        const auth = await import('./auth-verify');

        const result = await auth.verifyAdminSession(async () => ({
            success: false,
            session: null,
            error: 'Not authenticated',
        }));

        expect(result.success).toBe(false);
        expect(result.session).toBeNull();
        expect(result.error).toBe('Not authenticated');
    });

    it('verifyAdminSession allows admin role variants', async () => {
        const auth = await import('./auth-verify');

        const result = await auth.verifyAdminSession(async () => ({
            success: true,
            session: {
                user: {
                    id: 'admin-id',
                    email: 'admin@example.com',
                    name: 'Admin User',
                    role: ['user', 'ADMIN'],
                },
            },
        }));

        expect(result.success).toBe(true);
        expect(result.session?.user.role).toEqual(['user', 'ADMIN']);
    });
});
