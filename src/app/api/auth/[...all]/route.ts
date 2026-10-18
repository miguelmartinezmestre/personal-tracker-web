import { handler } from '../../../../features/auth/auth-server';

const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

// The Convex auth client asks for a token while the session is still loading. Without a session
// cookie or bearer token there is nothing to exchange, so answer directly instead of letting
// Better Auth reply 401 on every public page load.
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
