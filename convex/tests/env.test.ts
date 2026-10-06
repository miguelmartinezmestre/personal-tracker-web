import { afterEach, describe, expect, test, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEnvModule() {
    vi.resetModules();
    const { getEnvs } = await import('../env');
    return getEnvs();
}

async function loadFrontendEnvModule() {
    vi.resetModules();
    return await import('../../src/lib/env');
}

afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
});

describe('Convex runtime env', () => {
    test('uses local defaults when development URLs are omitted', async () => {
        process.env = { ...originalEnv, NODE_ENV: 'development' };
        delete process.env.SITE_URL;
        delete process.env.BETTER_AUTH_URL;
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).resolves.toMatchObject({
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://localhost:3000',
            SETUP_SECRET: undefined,
        });
    });

    test('does not require JWKS in production', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'https://app.example.com',
            BETTER_AUTH_URL: 'https://app.example.com',
            SETUP_SECRET: 's'.repeat(32),
        };
        delete process.env.JWKS;

        await expect(loadEnvModule()).resolves.toMatchObject({
            JWKS: undefined,
            SITE_URL: 'https://app.example.com',
            BETTER_AUTH_URL: 'https://app.example.com',
            SETUP_SECRET: 's'.repeat(32),
        });
    });

    test('requires a dedicated setup secret for a non-loopback deployment', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'https://app.example.com',
            BETTER_AUTH_URL: 'https://app.example.com',
        };
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).rejects.toThrow(
            'SETUP_SECRET must be set when SITE_URL is not a loopback URL'
        );
    });

    test('rejects a weak setup secret', async () => {
        process.env = {
            ...originalEnv,
            SITE_URL: 'https://app.example.com',
            BETTER_AUTH_URL: 'https://app.example.com',
            SETUP_SECRET: 'too-short',
        };

        await expect(loadEnvModule()).rejects.toThrow(
            'SETUP_SECRET must contain between 32 and 256 characters'
        );
    });

    test('still requires production auth URLs', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
        };
        delete process.env.SITE_URL;
        delete process.env.BETTER_AUTH_URL;
        delete process.env.JWKS;
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).rejects.toThrow('SITE_URL must be set in production');
    });

    test('requires BETTER_AUTH_URL even when SITE_URL is configured in production', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'https://app.example.com',
            SETUP_SECRET: 's'.repeat(32),
        };
        delete process.env.BETTER_AUTH_URL;

        await expect(loadEnvModule()).rejects.toThrow('BETTER_AUTH_URL must be set in production');
    });

    test.each(['not-a-url', 'ftp://app.example.com'])(
        'rejects invalid HTTP URLs: %s',
        async url => {
            process.env = {
                ...originalEnv,
                NODE_ENV: 'development',
                SITE_URL: url,
                BETTER_AUTH_URL: 'http://localhost:3000',
            };

            await expect(loadEnvModule()).rejects.toThrow('SITE_URL must be a valid http(s) URL');
        }
    );

    test('rejects HTTP auth URLs in production', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'http://app.example.com',
            BETTER_AUTH_URL: 'http://app.example.com',
            SETUP_SECRET: 's'.repeat(32),
        };
        delete process.env.E2E_SETUP_SECRET;

        await expect(loadEnvModule()).rejects.toThrow('SITE_URL must use HTTPS in production');
    });

    test('allows production-mode HTTP localhost for the local Convex stack', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://localhost:3000',
        };
        delete process.env.E2E_SETUP_SECRET;
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).resolves.toMatchObject({
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://localhost:3000',
            SETUP_SECRET: undefined,
        });
    });

    test('allows production-mode HTTP localhost for the local E2E stack', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            E2E_SETUP_SECRET: 'local-e2e-secret',
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://localhost:3000',
        };
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).resolves.toMatchObject({
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://localhost:3000',
            SETUP_SECRET: undefined,
        });
    });

    test('does not let a local E2E URL exempt a remote auth URL from HTTPS', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            E2E_SETUP_SECRET: 'local-e2e-secret',
            SITE_URL: 'http://localhost:3000',
            BETTER_AUTH_URL: 'http://auth.example.com',
        };
        delete process.env.SETUP_SECRET;

        await expect(loadEnvModule()).rejects.toThrow(
            'BETTER_AUTH_URL must use HTTPS in production'
        );
    });

    test.each(['http://localhost.example.com', 'http://https.example.com'])(
        'does not mistake a public hostname for a permitted production URL: %s',
        async url => {
            process.env = {
                ...originalEnv,
                NODE_ENV: 'production',
                SITE_URL: url,
                BETTER_AUTH_URL: 'https://auth.example.com',
                SETUP_SECRET: 's'.repeat(32),
            };

            await expect(loadEnvModule()).rejects.toThrow('SITE_URL must use HTTPS in production');
        }
    );
});

describe('Next.js runtime env', () => {
    test('uses local defaults when development URLs are omitted', async () => {
        process.env = { ...originalEnv, NODE_ENV: 'development' };
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.NEXT_PUBLIC_CONVEX_URL;
        delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

        await expect(loadFrontendEnvModule()).resolves.toMatchObject({
            NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
            NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        });
    });

    test.each(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_CONVEX_URL', 'NEXT_PUBLIC_CONVEX_SITE_URL'])(
        'requires %s in production',
        async name => {
            process.env = {
                ...originalEnv,
                NODE_ENV: 'production',
                NEXT_PUBLIC_SITE_URL: 'https://app.example.com',
                NEXT_PUBLIC_CONVEX_URL: 'https://deployment.convex.cloud',
                NEXT_PUBLIC_CONVEX_SITE_URL: 'https://deployment.convex.site',
            };
            if (name === 'NEXT_PUBLIC_SITE_URL') {
                delete process.env.NEXT_PUBLIC_SITE_URL;
            } else if (name === 'NEXT_PUBLIC_CONVEX_URL') {
                delete process.env.NEXT_PUBLIC_CONVEX_URL;
            } else {
                delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
            }

            await expect(loadFrontendEnvModule()).rejects.toThrow(
                `${name} must be set in production`
            );
        }
    );

    test('rejects non-HTTP public URLs in development', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'development',
            NEXT_PUBLIC_SITE_URL: 'ftp://app.example.com',
        };

        await expect(loadFrontendEnvModule()).rejects.toThrow(
            'NEXT_PUBLIC_SITE_URL must be a valid http(s) URL'
        );
    });

    test('requires the explicit E2E flag for production-mode HTTP localhost', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
            NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        };
        delete process.env.NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP;

        await expect(loadFrontendEnvModule()).rejects.toThrow(
            'NEXT_PUBLIC_SITE_URL must use HTTPS in production'
        );
    });

    test('rejects HTTP public URLs in production', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_SITE_URL: 'http://app.example.com',
            NEXT_PUBLIC_CONVEX_URL: 'https://deployment.convex.cloud',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'https://deployment.convex.site',
        };
        delete process.env.E2E_SETUP_SECRET;

        await expect(loadFrontendEnvModule()).rejects.toThrow(
            'NEXT_PUBLIC_SITE_URL must use HTTPS in production'
        );
    });

    test('allows production-mode HTTP localhost for the local E2E stack', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP: 'true',
            NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
            NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        };

        await expect(loadFrontendEnvModule()).resolves.toMatchObject({
            NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
            NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        });
    });

    test('does not let the E2E flag exempt a remote public URL from HTTPS', async () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP: 'true',
            NEXT_PUBLIC_SITE_URL: 'http://app.example.com',
            NEXT_PUBLIC_CONVEX_URL: 'http://127.0.0.1:3210',
            NEXT_PUBLIC_CONVEX_SITE_URL: 'http://127.0.0.1:3211',
        };

        await expect(loadFrontendEnvModule()).rejects.toThrow(
            'NEXT_PUBLIC_SITE_URL must use HTTPS in production'
        );
    });
});
