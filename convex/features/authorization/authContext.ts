import { isActiveAccount } from '../auth/users';
import { ConvexError } from 'convex/values';
import { getAuthUserIdentity, getSession } from 'kitcn/auth';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';

export type AuthContext = {
    userId: Id<'user'>;
    // Null until verified: invitations are matched by email, so an unverified address proves nothing.
    email: string | null;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

export async function resolveActiveMembership(
    ctx: QueryCtx | MutationCtx,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null
): Promise<{ role: string | null; organizationId: Id<'organization'> | null }> {
    if (!organizationId || !(await ctx.db.get('organization', organizationId))) {
        return { role: null, organizationId: null };
    }

    const membership = await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', organizationId).eq('userId', userId)
        )
        .first();

    if (membership) {
        return { role: membership.role, organizationId };
    }

    return { role: null, organizationId: null };
}

export async function resolveAuthContext(ctx: QueryCtx | MutationCtx): Promise<AuthContext> {
    const identity = await getAuthUserIdentity(ctx);

    if (!identity) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const currentUser = await ctx.db.get('user', identity.userId);

    if (!isActiveAccount(currentUser, Date.now()) || !currentUser) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const session = await getSession(ctx);

    if (!session || session.expiresAt < Date.now()) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    // Better Auth clears the active organization before a delete hook can refuse, and does not
    // roll it back; a session without one is still signed in.
    const activeOrganizationId = session.activeOrganizationId
        ? ctx.db.normalizeId('organization', session.activeOrganizationId)
        : null;

    const { role: memberRole, organizationId } = await resolveActiveMembership(
        ctx,
        currentUser._id,
        activeOrganizationId
    );

    return {
        userId: currentUser._id,
        email: currentUser.emailVerified ? currentUser.email : null,
        organizationId,
        role: currentUser.role ?? 'user',
        memberRole,
    };
}
