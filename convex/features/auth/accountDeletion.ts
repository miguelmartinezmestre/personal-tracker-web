import { getOrganization, getUser, type AuthReader, type AuthWriter } from './authRecords';
import { isPersonalOrganizationForUser } from '../organizations/personalOrganization';

export type AccountDeletionBlocker = 'setupUser' | 'ownerSuccessorRequired';

const MAX_MEMBERSHIPS = 200;

/** Owned organizations that would be left with members but no owner. */
export async function organizationsNeedingNewOwner(ctx: AuthReader, userId: string) {
    const id = ctx.db.normalizeId('user', userId);
    const names: string[] = [];

    if (!id) {
        return names;
    }

    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', id))
        .take(MAX_MEMBERSHIPS);

    for (const membership of memberships.filter(member => member.role === 'owner')) {
        const organization = await getOrganization(ctx, membership.organizationId);

        if (
            !organization ||
            isPersonalOrganizationForUser({ metadata: organization.metadata, userId })
        ) {
            continue;
        }

        const others = (
            await ctx.db
                .query('member')
                .withIndex('organizationId', q => q.eq('organizationId', organization._id))
                .take(MAX_MEMBERSHIPS)
        ).filter(member => member.userId !== id);

        // A member whose account is already being deleted will lose the membership, so it
        // cannot be the successor.
        const remaining = [];

        for (const member of others) {
            const memberUser = await getUser(ctx, member.userId);

            if (memberUser && memberUser.deletedAt === undefined) {
                remaining.push(member);
            }
        }

        if (remaining.length > 0 && !remaining.some(member => member.role === 'owner')) {
            names.push(organization.name);
        }
    }

    return names;
}

export async function findAccountDeletionBlocker(
    ctx: AuthReader,
    userId: string
): Promise<AccountDeletionBlocker | null> {
    const settings = await ctx.db.query('platformSettings').first();

    if (settings?.setupCompletedBy === userId) {
        return 'setupUser';
    }

    if ((await organizationsNeedingNewOwner(ctx, userId)).length > 0) {
        return 'ownerSuccessorRequired';
    }

    return null;
}

/** The stored credential hash, read only by the account deletion endpoint to check the password. */
export async function getPasswordHash(ctx: AuthReader, userId: string) {
    const id = ctx.db.normalizeId('user', userId);

    if (!id) {
        return null;
    }

    const account = await ctx.db
        .query('account')
        .withIndex('providerId_userId', q => q.eq('providerId', 'credential').eq('userId', id))
        .unique();

    return account?.password ?? null;
}

export async function anonymizeAccount(ctx: AuthWriter, userId: string) {
    const user = await getUser(ctx, userId);

    if (!user || user.deletedAt !== undefined) {
        return;
    }

    const now = Date.now();

    await ctx.db.patch('user', user._id, {
        email: `deleted-${user._id}@deleted.invalid`,
        emailVerified: false,
        image: null,
        userId: null,
        role: null,
        banned: true,
        banReason: 'Account deleted',
        banExpires: null,
        deletedAt: now,
        updatedAt: now,
    });
}

export async function deleteAccountsBatch(ctx: AuthWriter, userId: string, batchSize: number) {
    const id = ctx.db.normalizeId('user', userId);

    if (!id) {
        return 0;
    }

    const rows = await ctx.db
        .query('account')
        .withIndex('userId', q => q.eq('userId', id))
        .take(batchSize);

    for (const row of rows) {
        await ctx.db.delete('account', row._id);
    }

    return rows.length;
}
