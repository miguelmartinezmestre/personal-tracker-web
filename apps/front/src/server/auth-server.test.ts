import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@convex-dev/better-auth/nextjs', () => ({
    getToken: vi.fn(),
}));

vi.mock('@repo/backend/convex/auth', () => ({
    createAuth: { provider: 'mock-auth' },
}));

describe('auth-server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to getTokenNextjs with the auth config', async () => {
        const { getToken } = await import('./auth-server');
        const { getToken: getTokenNextjs } = await import('@convex-dev/better-auth/nextjs');
        const { createAuth } = await import('@repo/backend/convex/auth');

        vi.mocked(getTokenNextjs).mockResolvedValue('token-result');

        const result = await getToken();

        expect(getTokenNextjs).toHaveBeenCalledWith(createAuth);
        expect(result).toBe('token-result');
    });
});
