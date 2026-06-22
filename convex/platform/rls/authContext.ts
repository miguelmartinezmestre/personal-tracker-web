import { ConvexError } from 'convex/values';
import { getAuthUserIdentity, getSession } from 'kitcn/auth';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';

export type AuthContext = {
    userId: Id<'user'>;
    email: string;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

export async function resolveActiveMembership(
    ctx: QueryCtx | MutationCtx,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null
): Promise<{ role: string | null; organizationId: Id<'organization'> | null }> {
    if (!organizationId) {
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
    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const session = await getSession(ctx);

    const expiresAt =
        session && typeof session === 'object'
            ? ((session as { session?: { expiresAt?: number | null }; expiresAt?: number | null })
                  .session?.expiresAt ??
              (session as { expiresAt?: number | null }).expiresAt ??
              null)
            : null;

    if (
        !session ||
        (typeof expiresAt === 'number' && expiresAt < Date.now()) ||
        !session.activeOrganizationId
    ) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const activeOrganizationId = ctx.db.normalizeId('organization', session?.activeOrganizationId);

    const { role: memberRole, organizationId } = await resolveActiveMembership(
        ctx,
        currentUser._id,
        activeOrganizationId
    );

    return {
        userId: currentUser._id,
        email: currentUser.email,
        organizationId,
        role: currentUser.role ?? 'user',
        memberRole,
    };
}
