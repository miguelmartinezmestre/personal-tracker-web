import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const AUTH_ROUTES = ['/login', '/register', '/forget-password', '/reset-password'];
const PROTECTED_PREFIX = '/dashboard';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.endsWith(route));
    const isProtectedRoute = pathname.startsWith(PROTECTED_PREFIX);

    if (sessionCookie && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard/home', request.url));
    }

    if (!sessionCookie && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
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
