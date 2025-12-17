import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // First, handle internationalization (this sets the locale from cookie)
  const intlResponse = intlMiddleware(request);
  
  // If next-intl middleware returns a redirect or error, return it
  if (intlResponse.status !== 200) {
    return intlResponse;
  }

  // Then, handle authentication for dashboard routes
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Return the response from next-intl middleware
  return intlResponse;
}

export const config = {
  // Match all pathnames except for API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

