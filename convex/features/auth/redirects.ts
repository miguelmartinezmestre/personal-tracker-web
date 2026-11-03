const DEFAULT_AUTH_CALLBACK = '/dashboard/home';
const AUTH_ROUTES = ['/login', '/register', '/forget-password', '/reset-password'];
const PROTECTED_PREFIX = '/dashboard';

export function getSafeCallbackPath(
    value: string | null | undefined,
    fallback = DEFAULT_AUTH_CALLBACK
): string {
    const candidate = value?.trim();

    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
        return fallback;
    }

    const lowerCandidate = candidate.toLowerCase();

    if (
        candidate.includes('\\') ||
        lowerCandidate.startsWith('/%5c') ||
        lowerCandidate.startsWith('/%2f%2f')
    ) {
        return fallback;
    }

    try {
        const base = new URL('https://callback.invalid');
        const parsed = new URL(candidate, base);

        if (parsed.origin === base.origin) {
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }

        return fallback;
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

export function getAuthRouteRedirect({
    pathname,
    search,
    hasSessionCookie,
}: {
    pathname: string;
    search: string;
    hasSessionCookie: boolean;
}): string | null {
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
