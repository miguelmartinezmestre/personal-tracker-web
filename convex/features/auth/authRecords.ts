import type { DatabaseReader, DatabaseWriter } from '../../_generated/server';
import { isActiveAccount } from './users';

/**
 * Reads of the Better Auth tables. Ids come in as plain strings
 */

export type AuthReader = { db: DatabaseReader };

export type AuthWriter = { db: DatabaseWriter };

export async function getUser(ctx: AuthReader, userId: string | null | undefined) {
    const id = userId ? ctx.db.normalizeId('user', userId) : null;

    return id ? await ctx.db.get('user', id) : null;
}

export async function getActiveUser(ctx: AuthReader, userId: string | null | undefined) {
    const user = await getUser(ctx, userId);

    return user && isActiveAccount(user, Date.now()) ? user : null;
}

export async function getOrganization(ctx: AuthReader, organizationId: string | null | undefined) {
    const id = organizationId ? ctx.db.normalizeId('organization', organizationId) : null;

    return id ? await ctx.db.get('organization', id) : null;
}

export async function getSession(ctx: AuthReader, sessionId: string | null | undefined) {
    const id = sessionId ? ctx.db.normalizeId('session', sessionId) : null;

    return id ? await ctx.db.get('session', id) : null;
}

export async function getInvitation(ctx: AuthReader, invitationId: string | null | undefined) {
    const id = invitationId ? ctx.db.normalizeId('invitation', invitationId) : null;

    return id ? await ctx.db.get('invitation', id) : null;
}

export async function getMembership(ctx: AuthReader, organizationId: string, userId: string) {
    const orgId = ctx.db.normalizeId('organization', organizationId);
    const memberUserId = ctx.db.normalizeId('user', userId);

    if (!orgId || !memberUserId) {
        return null;
    }

    return await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', orgId).eq('userId', memberUserId)
        )
        .first();
}

/** Role of the user in an organization that still exists, or null. */
export async function getMembershipRole(
    ctx: AuthReader,
    organizationId: string | null | undefined,
    userId: string
) {
    const organization = await getOrganization(ctx, organizationId);

    if (!organization) {
        return null;
    }

    return (await getMembership(ctx, organization._id, userId))?.role ?? null;
}

export async function getUserSummaries(ctx: AuthReader, userIds: string[]) {
    const users = await Promise.all([...new Set(userIds)].map(userId => getUser(ctx, userId)));

    return users
        .filter(user => user !== null)
        .map((user): { id: string; name: string; email: string } => ({
            id: user._id,
            name: user.name,
            email: user.email,
        }));
}
