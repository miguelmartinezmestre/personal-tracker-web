const isProduction = process.env.NODE_ENV === 'production';

const publicEnv = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
} as const;

function requirePublicUrl(name: keyof typeof publicEnv, fallback: string): string {
    const value = publicEnv[name];

    if (isProduction && !value) {
        throw new Error(`${name} must be set in production`);
    }

    const resolved = value ?? fallback;
    try {
        const parsed = new URL(resolved);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('invalid protocol');
        }
    } catch {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    return resolved;
}

export const env = {
    NEXT_PUBLIC_SITE_URL: requirePublicUrl('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
    NEXT_PUBLIC_CONVEX_URL: requirePublicUrl('NEXT_PUBLIC_CONVEX_URL', 'http://127.0.0.1:3210'),
    NEXT_PUBLIC_CONVEX_SITE_URL: requirePublicUrl(
        'NEXT_PUBLIC_CONVEX_SITE_URL',
        'http://127.0.0.1:3211'
    ),
} as const;
