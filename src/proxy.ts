import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { securityHeaders } from '@/lib/security-headers';
import { getAuthRouteRedirect } from '@/convex/features/auth/redirects';

export default function proxy(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    const headers = securityHeaders({
        nonce,
        siteUrl: request.url,
        convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210',
        development: process.env.NODE_ENV === 'development',
    });

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', headers['Content-Security-Policy']);

    const attachHeaders = (response: NextResponse) => {
        for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
        }

        return response;
    };

    const { pathname, search } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);

    const authRedirect = getAuthRouteRedirect({
        pathname,
        search,
        hasSessionCookie: Boolean(sessionCookie),
    });

    if (authRedirect) {
        return attachHeaders(NextResponse.redirect(new URL(authRedirect, request.url)));
    }

    return attachHeaders(
        NextResponse.next({
            request: { headers: requestHeaders },
        })
    );
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
