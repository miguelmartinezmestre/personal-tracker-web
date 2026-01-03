import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const sessionCookie = getSessionCookie(request);

    // Redirect authenticated users away from auth pages
    if (sessionCookie && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/dashboard/home', request.url));
    }

    // Redirect unauthenticated users away from dashboard routes
    if (!sessionCookie && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
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
