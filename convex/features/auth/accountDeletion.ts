import type { Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isPersonalOrganizationForUser } from '../organizations/personalOrganization';

const MAX_MEMBERSHIPS = 200;

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

        if (others.length > 0 && !others.some(member => member.role === 'owner')) {
            names.push(organization.name);
        }
    }

    return names;
}
