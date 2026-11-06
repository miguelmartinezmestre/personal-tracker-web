import type { QueryCtx } from '../../_generated/server';
import {
    deleteWhere,
    findAll,
    findOne,
    patchById,
    type AuthReader,
    type AuthWriter,
} from './authStore';
import { getOrganization, getUser } from './authRecords';
import { isPersonalOrganizationForUser } from '../organizations/personalOrganization';

export type AccountDeletionBlocker = 'setupUser' | 'ownerSuccessorRequired';

const MAX_MEMBERSHIPS = 200;

/** Owned organizations that would be left with members but no owner. */
export async function organizationsNeedingNewOwner(ctx: AuthReader, userId: string) {
    const names: string[] = [];

    const memberships = await findAll(ctx, 'member', {
        where: [{ field: 'userId', value: userId }],
        limit: MAX_MEMBERSHIPS,
    });

    for (const membership of memberships.filter(member => member.role === 'owner')) {
        const organization = await getOrganization(ctx, membership.organizationId);

        if (
            !organization ||
            isPersonalOrganizationForUser({ metadata: organization.metadata, userId })
        ) {
            continue;
        }

        const others = (
            await findAll(ctx, 'member', {
                where: [{ field: 'organizationId', value: organization._id }],
                limit: MAX_MEMBERSHIPS,
            })
        ).filter(member => member.userId !== userId);

        // A member whose account is already being deleted will lose the membership, so it
        // cannot be the successor.
        const remaining = [];

        for (const member of others) {
            const memberUser = await getUser(ctx, member.userId);

            if (memberUser && memberUser.deletedAt == null) {
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
    ctx: Pick<QueryCtx, 'db' | 'runQuery'>,
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
    const account = await findOne(ctx, 'account', [
        { field: 'providerId', value: 'credential' },
        { field: 'userId', value: userId },
    ]);

    return account?.password ?? null;
}

export async function anonymizeAccount(ctx: AuthWriter, userId: string) {
    const user = await getUser(ctx, userId);

    if (!user || user.deletedAt != null) {
        return;
    }

    const now = Date.now();

    await patchById(ctx, 'user', user._id, {
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
    const { count } = await deleteWhere(
        ctx,
        'account',
        [{ field: 'userId', value: userId }],
        batchSize
    );

    return count;
}
