const DEFAULT_AUTH_CALLBACK = '/dashboard/home';
const AUTH_ROUTES = ['/login', '/register', '/forget-password', '/reset-password'];
const PROTECTED_PREFIX = '/dashboard';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export const SETUP_SECRET_HEADER = 'x-setup-secret';
export const MIN_SETUP_SECRET_LENGTH = 32;
export const MAX_SETUP_SECRET_LENGTH = 256;

export const ORGANIZATION_SECURITY_OPTIONS = {
    requireEmailVerificationOnInvitation: true,
} as const;

export function getSafeCallbackPath(
    value: string | null | undefined,
    fallback = DEFAULT_AUTH_CALLBACK
): string {
    const candidate = value?.trim();
    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
        return fallback;
    }

    if (candidate.includes('\\')) {
        return fallback;
    }

    try {
        const base = new URL('https://callback.invalid');
        const parsed = new URL(candidate, base);
        return parsed.origin === base.origin
            ? `${parsed.pathname}${parsed.search}${parsed.hash}`
            : fallback;
    } catch {
        return fallback;
    }
}

export function getInvitationCallbackPath(invitationId: string): string {
    return getSafeCallbackPath(`/invitations/${encodeURIComponent(invitationId)}`);
}

export function getInvitationIdFromCallbackPath(value: string | null | undefined): string | null {
    const safePath = getSafeCallbackPath(value, '');
    if (!safePath) {
        return null;
    }

    const parsed = new URL(safePath, 'https://callback.invalid');
    const match = /^\/invitations\/([^/]+)$/.exec(parsed.pathname);
    if (!match?.[1]) {
        return null;
    }

    try {
        const invitationId = decodeURIComponent(match[1]);
        return invitationId.trim() ? invitationId : null;
    } catch {
        return null;
    }
}

export function isLocalHostname(hostname: string): boolean {
    return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

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

    // Both values are bounded by the environment/header validation. A fixed
    // amount of work avoids leaking the configured secret length via a simple
    // early-return comparison.
    for (let index = 0; index < MAX_SETUP_SECRET_LENGTH; index += 1) {
        const expectedCode = index < expected.length ? expected.charCodeAt(index) : 0;
        const candidateCode = index < candidate.length ? candidate.charCodeAt(index) : 0;
        mismatch |= expectedCode ^ candidateCode;
    }

    return mismatch === 0;
}

type AuthRouteRedirectInput = {
    pathname: string;
    search: string;
    hasSessionCookie: boolean;
};

export function getAuthRouteRedirect({
    pathname,
    search,
    hasSessionCookie,
}: AuthRouteRedirectInput): string | null {
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.endsWith(route));
    if (isAuthRoute) {
        return null;
    }

    if (!hasSessionCookie && pathname.startsWith(PROTECTED_PREFIX)) {
        const params = new URLSearchParams({
            callbackUrl: getSafeCallbackPath(`${pathname}${search}`),
        });
        return `/login?${params.toString()}`;
    }

    return null;
}

type SecureHttpUrlOptions = {
    requireHttps: boolean;
    allowHttpLocalhost: boolean;
};

export function requireSecureHttpUrl(
    name: string,
    value: string,
    options: SecureHttpUrlOptions
): string {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`${name} must be a valid http(s) URL`);
    }

    const permittedLocalHttp =
        options.allowHttpLocalhost &&
        parsed.protocol === 'http:' &&
        isLocalHostname(parsed.hostname);

    if (options.requireHttps && parsed.protocol !== 'https:' && !permittedLocalHttp) {
        throw new Error(`${name} must use HTTPS in production`);
    }

    return value;
}
