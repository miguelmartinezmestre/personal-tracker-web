import { afterEach, describe, expect, test, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEnvModule() {
    vi.resetModules();
    return await import('../lib/env');
}

afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
});

describe('Convex runtime env', () => {
    test('does not require JWKS in production', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'https://app.example.com',
            BETTER_AUTH_URL: 'https://app.example.com',
        };
        delete process.env.JWKS;

        await expect(loadEnvModule()).resolves.toMatchObject({
            env: {
                JWKS: undefined,
                SITE_URL: 'https://app.example.com',
                BETTER_AUTH_URL: 'https://app.example.com',
            },
        });
    });

    test('still requires production auth URLs', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
        };
        delete process.env.SITE_URL;
        delete process.env.BETTER_AUTH_URL;
        delete process.env.JWKS;

        await expect(loadEnvModule()).rejects.toThrow('SITE_URL must be set in production');
    });
});
