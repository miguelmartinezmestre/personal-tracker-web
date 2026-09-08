import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';

export async function requireOperationalOrganization(
    ctx: { db: DatabaseReader },
    organizationId: Id<'organization'>
) {
    const organization = await ctx.db.get('organization', organizationId);
    if (!organization) {
        throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
    }
    return organization;
}

export function isActiveAccount(
    user: { banned?: boolean | null; banExpires?: number | null; deletedAt?: number } | null,
    now: number
): boolean {
    return (
        user !== null &&
        user.deletedAt === undefined &&
        !(user.banned === true && (user.banExpires == null || user.banExpires > now))
    );
}

export async function isOperationalMember(
    ctx: { db: DatabaseReader },
    organizationId: Id<'organization'>,
    userId: Id<'user'>
): Promise<boolean> {
    if (
        !(await ctx.db.get('organization', organizationId)) ||
        !isActiveAccount(await ctx.db.get('user', userId), Date.now())
    ) {
        return false;
    }
    return (
        (await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', userId)
            )
            .first()) !== null
    );
}
