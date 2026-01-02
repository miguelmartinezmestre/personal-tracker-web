import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('convex/nextjs', () => ({
    fetchQuery: vi.fn(),
}));

vi.mock('./auth-simple', () => ({
    getToken: vi.fn(),
}));

describe('getCurrentUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls fetchQuery with the auth token', async () => {
        const { fetchQuery } = await import('convex/nextjs');
        const { getToken } = await import('./auth-simple');
        const { api } = await import('@repo/backend/convex/_generated/api');

        vi.mocked(getToken).mockResolvedValue('token-123');

        const { getCurrentUser } = await import('./session');

        await getCurrentUser();

        expect(fetchQuery).toHaveBeenCalledWith(api.auth.getCurrentUser, {}, { token: 'token-123' });
    });
});
