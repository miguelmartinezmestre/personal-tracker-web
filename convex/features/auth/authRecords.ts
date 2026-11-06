import { findOne, getById, type AuthReader } from './authStore';
import { isActiveAccount } from './users';

/**
 * Reads of the Better Auth tables. Ids come in as plain strings
 */

export function getUser(ctx: AuthReader, userId: string | null | undefined) {
    return getById(ctx, 'user', userId);
}

export async function getActiveUser(ctx: AuthReader, userId: string | null | undefined) {
    const user = await getUser(ctx, userId);

    return user && isActiveAccount(user, Date.now()) ? user : null;
}

export function getOrganization(ctx: AuthReader, organizationId: string | null | undefined) {
    return getById(ctx, 'organization', organizationId);
}

export function getSession(ctx: AuthReader, sessionId: string | null | undefined) {
    return getById(ctx, 'session', sessionId);
}

export function getInvitation(ctx: AuthReader, invitationId: string | null | undefined) {
    return getById(ctx, 'invitation', invitationId);
}

export function getMembership(ctx: AuthReader, organizationId: string, userId: string) {
    return findOne(ctx, 'member', [
        { field: 'organizationId', value: organizationId },
        { field: 'userId', value: userId },
    ]);
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
        .map(user => ({ id: user._id, name: user.name, email: user.email }));
}
