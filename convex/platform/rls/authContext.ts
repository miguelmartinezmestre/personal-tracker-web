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

interface AuthSession {
    activeOrganizationId?: string | null;
    expiresAt?: number | null;
    session?: {
        activeOrganizationId?: string | null;
        expiresAt?: number | null;
    };
}

function extractOrganizationId(session: unknown): string | null {
    if (session === null || typeof session !== 'object') {
        return null;
    }

    const authSession = session as AuthSession;
    const raw =
        authSession.session?.activeOrganizationId ?? authSession.activeOrganizationId ?? null;

    if (typeof raw !== 'string') {
        return null;
    }

    return raw;
}

function isExpiredSession(session: unknown): boolean {
    if (session === null || typeof session !== 'object') {
        return false;
    }

    const authSession = session as AuthSession;
    const expiresAt = authSession.session?.expiresAt ?? authSession.expiresAt ?? null;

    return typeof expiresAt === 'number' && expiresAt < Date.now();
}

export async function resolveSessionActiveOrganizationId(
    ctx: QueryCtx | MutationCtx
): Promise<Id<'organization'> | null> {
    const session = await getSession(ctx);
    if (!session || isExpiredSession(session)) {
        return null;
    }

    const rawOrganizationId = extractOrganizationId(session);
    return rawOrganizationId ? ctx.db.normalizeId('organization', rawOrganizationId) : null;
}

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

    const activeOrganizationId = await resolveSessionActiveOrganizationId(ctx);

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
