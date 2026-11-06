import { ConvexError } from 'convex/values';
import type { QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { getActiveUser, getMembershipRole, getSession } from '../auth/authRecords';

export type AuthContext = {
    userId: string;
    email: string | null;
    organizationId: string | null;
    role: string;
    memberRole: string | null;
};

/**
 * The Better Auth session is checked on every call (not only the JWT), so revoking a session,
 * banning or deleting an account takes effect immediately.
 */
export async function resolveAuthContext(ctx: QueryCtx): Promise<AuthContext> {
    const identity = await ctx.auth.getUserIdentity();
    const sessionId = typeof identity?.sessionId === 'string' ? identity.sessionId : null;

    if (!identity || !sessionId) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const [user, session] = await Promise.all([
        getActiveUser(ctx, identity.subject),
        getSession(ctx, sessionId),
    ]);

    if (!user || !session || session.userId !== user._id || session.expiresAt < Date.now()) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const memberRole = await getMembershipRole(ctx, session.activeOrganizationId, user._id);

    return {
        userId: user._id,
        email: user.emailVerified ? user.email : null,
        organizationId: memberRole ? (session.activeOrganizationId ?? null) : null,
        role: user.role ?? 'user',
        memberRole,
    };
}
