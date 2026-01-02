import { describe, it, expect } from 'vitest';

describe('auth-simple', () => {
    it('getServerAuth returns an api with getSession returning null', async () => {
        const { getServerAuth } = await import('./auth-simple');

        const auth = getServerAuth();
        const session = await auth.api.getSession();

        expect(auth).toHaveProperty('api');
        expect(typeof auth.api.getSession).toBe('function');
        expect(session).toBeNull();
    });

    it('getToken returns null', async () => {
        const { getToken } = await import('./auth-simple');

        await expect(getToken()).resolves.toBeNull();
    });
});
