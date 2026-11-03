import { handler } from '../../../../features/auth/auth-server';

const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

// Without a session cookie or bearer token, answer here instead of a Better Auth 401 per page.
function isAnonymousTokenRequest(request: Request): boolean {
    return (
        new URL(request.url).pathname.endsWith('/convex/token') &&
        !request.headers.has('authorization') &&
        !SESSION_COOKIE.test(request.headers.get('cookie') ?? '')
    );
}

export async function GET(request: Request) {
    if (isAnonymousTokenRequest(request)) {
        return Response.json({ token: null });
    }

    return handler.GET(request);
}

export const { POST } = handler;
