export const authEnv = {
    JWKS: process.env['JWKS']?.trim() ? process.env['JWKS']?.trim() : undefined,
} as const;

const isLocalE2E =
    Boolean(process.env.E2E_SETUP_SECRET) &&
    (() => {
        const value = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL;
        if (!value) return false;

        try {
            const hostname = new URL(value).hostname;
            return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
        } catch {
            return false;
        }
    })();
const isProduction = process.env.NODE_ENV === 'production' && !isLocalE2E;

function requireProductionUrl(name: string, fallback: string): string {
    const envValue = process.env[name];

    if (isProduction && !envValue) {
        throw new Error(`${name} must be set in production`);
    }

    const value = envValue ?? fallback;

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('invalid protocol');
        }
    } catch {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    return value;
}

const siteUrl = requireProductionUrl('SITE_URL', 'http://localhost:3000');
const betterAuthUrl = requireProductionUrl('BETTER_AUTH_URL', siteUrl);
const jwks = authEnv.JWKS;

export const env = {
    SITE_URL: siteUrl,
    BETTER_AUTH_URL: betterAuthUrl,
    JWKS: jwks,
} as const;
