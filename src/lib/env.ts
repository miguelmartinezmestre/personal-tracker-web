import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';
const allowHttpLocalhost = !isProduction || process.env.NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP === 'true';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

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

    const permittedLocalHttp =
        allowHttpLocalhost &&
        parsed.protocol === 'http:' &&
        LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());

    if (isProduction && parsed.protocol !== 'https:' && !permittedLocalHttp) {
        throw new Error(`${name} must use HTTPS in production`);
    }

    return result.data;
}

export const NEXT_PUBLIC_SITE_URL = validateUrl(
    'NEXT_PUBLIC_SITE_URL',
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000'
);

export const NEXT_PUBLIC_CONVEX_URL = validateUrl(
    'NEXT_PUBLIC_CONVEX_URL',
    process.env.NEXT_PUBLIC_CONVEX_URL,
    'http://127.0.0.1:3210'
);

export const NEXT_PUBLIC_CONVEX_SITE_URL = validateUrl(
    'NEXT_PUBLIC_CONVEX_SITE_URL',
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    'http://127.0.0.1:3211'
);
