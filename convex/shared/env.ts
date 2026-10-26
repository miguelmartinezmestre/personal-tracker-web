import { env } from '../_generated/server';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export const MIN_SETUP_SECRET_LENGTH = 32;
export const MAX_SETUP_SECRET_LENGTH = 256;

export function isSetupSecretLengthValid(value: string): boolean {
    return (
        value.length === 0 ||
        (value.length >= MIN_SETUP_SECRET_LENGTH && value.length <= MAX_SETUP_SECRET_LENGTH)
    );
}

function validateUrl(name: string, value: string | undefined, fallback: string): string {
    if (isProduction && !value) {
        throw new Error(`${name} must be set in production`);
    }

    const result = z.url().safeParse(value ?? fallback);

    if (!result.success) {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    const parsed = new URL(result.data);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    // Convex also evaluates local development modules in production mode.
    const permittedLocalHttp =
        parsed.protocol === 'http:' && LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());

    if (isProduction && parsed.protocol !== 'https:' && !permittedLocalHttp) {
        throw new Error(`${name} must use HTTPS in production`);
    }

    return result.data;
}

export function getEnvs() {
    const SITE_URL = validateUrl('SITE_URL', env.SITE_URL, 'http://localhost:3000');
    const BETTER_AUTH_URL = validateUrl('BETTER_AUTH_URL', env.BETTER_AUTH_URL, SITE_URL);
    const JWKS = env.JWKS?.trim() || undefined;
    const rawBetterAuthSecret: unknown = env.BETTER_AUTH_SECRET;

    const BETTER_AUTH_SECRET =
        typeof rawBetterAuthSecret === 'string'
            ? rawBetterAuthSecret.trim() || undefined
            : undefined;

    const SETUP_SECRET = env.SETUP_SECRET?.trim() || undefined;

    // Better Auth only warns on a weak secret; a short value makes session/JWT
    // forgery feasible, so refuse to start instead.
    if (BETTER_AUTH_SECRET && BETTER_AUTH_SECRET.length < 32) {
        throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
    }

    if (BETTER_AUTH_SECRET && SETUP_SECRET && BETTER_AUTH_SECRET === SETUP_SECRET) {
        throw new Error('BETTER_AUTH_SECRET and SETUP_SECRET must be different');
    }

    const setupSecretIsRequired = !LOCAL_HOSTNAMES.has(new URL(SITE_URL).hostname.toLowerCase());

    if (setupSecretIsRequired && !SETUP_SECRET) {
        throw new Error('SETUP_SECRET must be set when SITE_URL is not a loopback URL');
    }

    if (SETUP_SECRET && !isSetupSecretLengthValid(SETUP_SECRET)) {
        throw new Error(
            `SETUP_SECRET must contain between ${MIN_SETUP_SECRET_LENGTH} and ${MAX_SETUP_SECRET_LENGTH} characters`
        );
    }

    return {
        SITE_URL,
        BETTER_AUTH_URL,
        JWKS,
        BETTER_AUTH_SECRET,
        SETUP_SECRET,
        ENVIRONMENT: isProduction ? 'production' : 'development',
    };
}
