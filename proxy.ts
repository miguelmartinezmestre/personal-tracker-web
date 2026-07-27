import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { getAuthRouteRedirect } from './shared/auth-security';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);
    const authRedirect = getAuthRouteRedirect({
        pathname,
        search,
        hasSessionCookie: Boolean(sessionCookie),
    });

    if (authRedirect) {
        return NextResponse.redirect(new URL(authRedirect, request.url));
    }

    const intlResponse = intlMiddleware(request);

    if (intlResponse.status !== 200) {
        return intlResponse;
    }

    return intlResponse;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
