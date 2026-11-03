import type { Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isPersonalOrganizationForUser } from '../organizations/personalOrganization';

const MAX_MEMBERSHIPS = 200;

export type AccountDeletionBlocker = 'setupUser' | 'ownerSuccessorRequired';

export async function organizationsNeedingNewOwner(db: QueryCtx['db'], userId: Id<'user'>) {
    const names: string[] = [];

    const memberships = await db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(MAX_MEMBERSHIPS);

    for (const membership of memberships.filter(member => member.role === 'owner')) {
        const organization = await db.get('organization', membership.organizationId);

        if (
            !organization ||
            isPersonalOrganizationForUser({ metadata: organization.metadata, userId })
        ) {
            continue;
        }

        const others = (
            await db
                .query('member')
                .withIndex('organizationId', q => q.eq('organizationId', organization._id))
                .take(MAX_MEMBERSHIPS)
        ).filter(member => member.userId !== userId);

        // A member whose account is already being deleted will lose the membership, so it
        // cannot be the successor.
        const remaining = [];

        for (const member of others) {
            const memberUser = await db.get('user', member.userId);

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
    db: QueryCtx['db'],
    userId: Id<'user'>
): Promise<AccountDeletionBlocker | null> {
    const settings = await db.query('platformSettings').first();

    if (settings?.setupCompletedBy === userId) {
        return 'setupUser';
    }

    if ((await organizationsNeedingNewOwner(db, userId)).length > 0) {
        return 'ownerSuccessorRequired';
    }

    return null;
}
