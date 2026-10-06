import { env } from './_generated/server';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export const MIN_SETUP_SECRET_LENGTH = 32;
export const MAX_SETUP_SECRET_LENGTH = 256;
export const SETUP_SECRET_HEADER = 'x-setup-secret';

export function isSetupSecretLengthValid(value: string): boolean {
    return (
        value.length === 0 ||
        (value.length >= MIN_SETUP_SECRET_LENGTH && value.length <= MAX_SETUP_SECRET_LENGTH)
    );
}

export function isSetupSecretValid(
    expected: string | undefined,
    provided: string | null | undefined
): boolean {
    if (!expected) {
        return true;
    }

    const candidate = provided ?? '';
    let mismatch = expected.length ^ candidate.length;
    mismatch |= isSetupSecretLengthValid(expected) && expected.length > 0 ? 0 : 1;
    mismatch |= isSetupSecretLengthValid(candidate) && candidate.length > 0 ? 0 : 1;

    for (let index = 0; index < MAX_SETUP_SECRET_LENGTH; index += 1) {
        const expectedCode = index < expected.length ? expected.charCodeAt(index) : 0;
        const candidateCode = index < candidate.length ? candidate.charCodeAt(index) : 0;
        mismatch |= expectedCode ^ candidateCode;
    }

    return mismatch === 0;
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
    const SETUP_SECRET = env.SETUP_SECRET?.trim() || undefined;
    const setupSecretIsRequired = !LOCAL_HOSTNAMES.has(new URL(SITE_URL).hostname.toLowerCase());
    const RESEND_API_KEY = env.RESEND_API_KEY?.trim() || undefined;

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
        SETUP_SECRET,
        RESEND_API_KEY,
        ENVIRONMENT: isProduction ? 'production' : 'development',
    };
}
