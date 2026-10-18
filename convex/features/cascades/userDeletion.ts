import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';
import { isPersonalOrganizationForUser } from '../organizations/personalOrganization';

export const USER_DELETION_BATCH_SIZE = 50;

export type UserDeletionPhase = 'sessions' | 'accounts' | 'memberships';

export type UserDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: UserDeletionPhase;
};

export async function anonymizeUser(ctx: MutationCtx, userId: Id<'user'>) {
    const user = await ctx.db.get('user', userId);

    if (!user || user.deletedAt !== undefined) {
        return;
    }

    const now = Date.now();
    await ctx.db.patch('user', userId, {
        name: 'Deleted account',
        email: `deleted-${String(userId)}@deleted.invalid`,
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

export async function deleteUserSessionsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('session', row._id);
    }

    return rows.length;
}

export async function deleteUserAccountsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('account')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('account', row._id);
    }

    return rows.length;
}

export async function deleteUserMembershipsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const membership of memberships) {
        await transferOrDeleteMembership(ctx, membership, userId);
    }

    return memberships.length;
}

async function transferOrDeleteMembership(
    ctx: MutationCtx,
    membership: {
        _id: Id<'member'>;
        organizationId: Id<'organization'>;
        role: string;
    },
    userId: Id<'user'>
) {
    const organization = await ctx.db.get('organization', membership.organizationId);

    const otherMembers = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', membership.organizationId))
        .take(USER_DELETION_BATCH_SIZE + 1);

    const successors = otherMembers
        .filter(member => member.userId !== userId)
        .sort((a, b) => a.createdAt - b.createdAt);

    let isPersonal = false;

    if (organization) {
        isPersonal = isPersonalOrganizationForUser({ metadata: organization.metadata, userId });
    }

    if (organization && (isPersonal || successors.length === 0)) {
        if (await ctx.db.get('organization', organization._id)) {
            await ctx.db.delete('organization', organization._id);
        }

        await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
            organizationId: organization._id,
            phase: 'progressUpdates',
        });
    } else if (membership.role === 'owner' && !successors.some(member => member.role === 'owner')) {
        const successor = successors.at(0);

        if (successor) {
            await ctx.db.patch('member', successor._id, { role: 'owner' });
        }
    }

    await ctx.db.delete('member', membership._id);
}
