import {
    isLocalHostname,
    isSetupSecretLengthValid,
    MIN_SETUP_SECRET_LENGTH,
    MAX_SETUP_SECRET_LENGTH,
    requireSecureHttpUrl,
} from '../../shared/auth-security';

export const authEnv = {
    JWKS: process.env['JWKS']?.trim() ? process.env['JWKS']?.trim() : undefined,
} as const;

const isProduction = process.env.NODE_ENV === 'production';
const allowLocalE2EHttp = Boolean(process.env.E2E_SETUP_SECRET);

function requireProductionUrl(name: string, fallback: string): string {
    const envValue = process.env[name];

    if (isProduction && !envValue) {
        throw new Error(`${name} must be set in production`);
    }

    const value = envValue ?? fallback;

    return requireSecureHttpUrl(name, value, {
        requireHttps: isProduction,
        allowHttpLocalhost: allowLocalE2EHttp,
    });
}

const siteUrl = requireProductionUrl('SITE_URL', 'http://localhost:3000');
const betterAuthUrl = requireProductionUrl('BETTER_AUTH_URL', siteUrl);
const jwks = authEnv.JWKS;
const setupSecret = process.env.SETUP_SECRET?.trim() || undefined;
const setupSecretIsRequired = !isLocalHostname(new URL(siteUrl).hostname);

if (setupSecretIsRequired && !setupSecret) {
    throw new Error('SETUP_SECRET must be set when SITE_URL is not a loopback URL');
}

if (setupSecret && !isSetupSecretLengthValid(setupSecret)) {
    throw new Error(
        `SETUP_SECRET must contain between ${MIN_SETUP_SECRET_LENGTH} and ${MAX_SETUP_SECRET_LENGTH} characters`
    );
}

export const env = {
    SITE_URL: siteUrl,
    BETTER_AUTH_URL: betterAuthUrl,
    JWKS: jwks,
    SETUP_SECRET: setupSecret,
} as const;
