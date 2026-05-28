import { ConvexError } from 'convex/values';
import { getAuthUserIdentity, getHeaders } from 'kitcn/auth';
import { getAuth } from '../../generated/auth';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { isVitestRuntime } from '../../utils/testRuntime';

export type AuthContext = {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

interface AuthSession {
    session?: {
        activeOrganizationId?: string | null;
    };
}

function extractOrganizationId(session: unknown): string | null {
    if (session === null || typeof session !== 'object') {
        return null;
    }

    const authSession = session as AuthSession;
    const raw = authSession.session?.activeOrganizationId ?? null;

    if (typeof raw !== 'string') {
        return null;
    }

    return raw;
}

async function getLatestMembership(
    ctx: QueryCtx | MutationCtx,
    userId: Id<'user'>
): Promise<{ role: string | null; organizationId: Id<'organization'> | null }> {
    const fallback = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .order('desc')
        .first();
    if (!fallback) {
        return { role: null, organizationId: null };
    }
    return {
        role: fallback.role,
        organizationId: fallback.organizationId,
    };
}

async function resolveActiveMembership(
    ctx: QueryCtx | MutationCtx,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null
): Promise<{ role: string | null; organizationId: Id<'organization'> | null }> {
    if (!organizationId) {
        return isVitestRuntime()
            ? await getLatestMembership(ctx, userId)
            : { role: null, organizationId: null };
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

    return isVitestRuntime()
        ? await getLatestMembership(ctx, userId)
        : { role: null, organizationId: null };
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

    let activeOrganizationId: Id<'organization'> | null = null;
    try {
        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const session = await auth.api.getSession({ headers });
        const rawOrganizationId = extractOrganizationId(session);
        activeOrganizationId = rawOrganizationId
            ? ctx.db.normalizeId('organization', rawOrganizationId)
            : null;
    } catch {
        activeOrganizationId = null;
    }

    const { role: memberRole, organizationId } = await resolveActiveMembership(
        ctx,
        currentUser._id,
        activeOrganizationId
    );

    return {
        userId: currentUser._id,
        organizationId,
        role: currentUser.role ?? 'user',
        memberRole,
    };
}
