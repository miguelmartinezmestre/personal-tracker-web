import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('better-auth/react', () => ({
    createAuthClient: vi.fn(() => ({ client: 'mock-auth-client' })),
}));

vi.mock('@convex-dev/better-auth/client/plugins', () => ({
    convexClient: vi.fn(() => ({ plugin: 'convex' })),
}));

vi.mock('better-auth/client/plugins', () => ({
    adminClient: vi.fn(() => ({ plugin: 'admin' })),
    organizationClient: vi.fn((options: unknown) => ({
        plugin: 'organization',
        options,
    })),
}));

describe('auth-client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates the auth client with expected plugins and schema', async () => {
        const { authClient } = await import('@/features/auth/auth-client');
        const { createAuthClient } = await import('better-auth/react');
        const { convexClient } = await import('@convex-dev/better-auth/client/plugins');
        const { adminClient, organizationClient } = await import('better-auth/client/plugins');

        expect(createAuthClient).toHaveBeenCalledTimes(1);
        expect(convexClient).toHaveBeenCalledTimes(1);
        expect(adminClient).toHaveBeenCalledTimes(1);
        expect(organizationClient).toHaveBeenCalledWith({
            schema: {
                organization: {
                    fields: {
                        slug: 'slug',
                        description: 'description',
                        logo: 'logo',
                    },
                },
            },
        });

        const options = vi.mocked(createAuthClient).mock.calls[0]?.[0];
        if (!options) {
            throw new Error('Expected createAuthClient to be called with options.');
        }
        const convexPlugin = vi.mocked(convexClient).mock.results[0].value;
        const adminPlugin = vi.mocked(adminClient).mock.results[0].value;
        const orgPlugin = vi.mocked(organizationClient).mock.results[0].value;

        expect(options.plugins).toEqual([convexPlugin, adminPlugin, orgPlugin]);
        expect(authClient).toEqual({ client: 'mock-auth-client' });
    });
});
