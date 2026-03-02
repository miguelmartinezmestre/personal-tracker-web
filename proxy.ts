import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const AUTH_ROUTES = ['/login', '/register', '/forget-password', '/reset-password'];
const PROTECTED_PREFIX = '/dashboard';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.endsWith(route));
    const isProtectedRoute = pathname.startsWith(PROTECTED_PREFIX);

    // Redirect authenticated users away from auth pages
    if (sessionCookie && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard/home', request.url));
    }

    // Redirect unauthenticated users away from dashboard routes
    if (!sessionCookie && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
    }

    // First, handle internationalization (this sets the locale from cookie)
    const intlResponse = intlMiddleware(request);

    // If next-intl middleware returns a redirect or error, return it
    if (intlResponse.status !== 200) {
        return intlResponse;
    }

    // Return the response from next-intl middleware
    return intlResponse;
}

export const config = {
    // Match all pathnames except for API routes, Next.js internals, and static files
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
