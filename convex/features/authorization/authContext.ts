import { ConvexError } from 'convex/values';
import { getAuthUserIdentity, getSession } from 'kitcn/auth';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { getActiveUser, getMembershipRole } from '../auth/authRecords';

export type AuthContext = {
    userId: string;
    // Null until verified: invitations are matched by email, so an unverified address proves nothing.
    email: string | null;
    organizationId: string | null;
    role: string;
    memberRole: string | null;
};

export async function resolveAuthContext(ctx: QueryCtx | MutationCtx): Promise<AuthContext> {
    const identity = await getAuthUserIdentity(ctx);

    if (!identity) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const currentUser = await getActiveUser(ctx, identity.userId);

    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const session = await getSession(ctx);

    if (!session || session.expiresAt < Date.now()) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    // Better Auth clears the active organization before a delete hook can refuse, with no rollback.
    const activeOrganizationId = session.activeOrganizationId
        ? ctx.db.normalizeId('organization', session.activeOrganizationId)
        : null;

    const memberRole = await getMembershipRole(ctx, activeOrganizationId, currentUser._id);
    const organizationId = memberRole ? activeOrganizationId : null;

    return {
        userId: currentUser._id,
        email: currentUser.emailVerified ? currentUser.email : null,
        organizationId,
        role: currentUser.role ?? 'user',
        memberRole,
    };
}
