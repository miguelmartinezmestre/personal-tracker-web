import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetToken = vi.fn();

vi.mock('@convex-dev/better-auth/nextjs', () => ({
    convexBetterAuthNextJs: vi.fn(() => ({
        getToken: mockGetToken,
    })),
}));

vi.mock('@repo/backend/convex/auth', () => ({
    createAuth: { provider: 'mock-auth' },
}));

describe('auth-server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to getTokenNextjs with the auth config', async () => {
        const { getToken } = await import('@/features/auth/auth-server');
        const { createAuth } = await import('@repo/backend/convex/auth');

        mockGetToken.mockResolvedValue('token-result');

        const result = await getToken();

        expect(mockGetToken).toHaveBeenCalled();
        expect(result).toBe('token-result');
    });
});
