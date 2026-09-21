import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { isPersonalOrganizationForUser } from '../../domain/organizations/personalOrganization';
import { startOrganizationDeletionCascade } from '../organizations/cascadeDeletion';

const USER_DELETION_BATCH_SIZE = 50;

export type UserDeletionPhase = 'sessions' | 'accounts' | 'memberships';

type ContinueUserDeletionArgs = {
    userId: Id<'user'>;
    phase?: UserDeletionPhase;
};

type UserDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: UserDeletionPhase;
};

async function scheduleNext(ctx: MutationCtx, userId: Id<'user'>, phase: UserDeletionPhase) {
    await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
        userId,
        phase,
    });
}

async function anonymizeUser(ctx: MutationCtx, userId: Id<'user'>) {
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

async function advanceUserDeletionPhase(args: {
    ctx: MutationCtx;
    userId: Id<'user'>;
    currentPhase: UserDeletionPhase;
    nextPhase: UserDeletionPhase;
    rowCount: number;
}): Promise<UserDeletionResult> {
    const next = args.rowCount === USER_DELETION_BATCH_SIZE ? args.currentPhase : args.nextPhase;
    await scheduleNext(args.ctx, args.userId, next);
    return { status: 'in_progress', phase: next };
}

async function deleteUserSessionsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('session', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'sessions',
        nextPhase: 'accounts',
        rowCount: rows.length,
    });
}

async function deleteUserAccountsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('account')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('account', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'accounts',
        nextPhase: 'memberships',
        rowCount: rows.length,
    });
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
    const isPersonal = organization
        ? isPersonalOrganizationForUser({
              metadata: organization.metadata,
              userId,
          })
        : false;
    if (organization && (isPersonal || successors.length === 0)) {
        await startOrganizationDeletionCascade(ctx, organization._id);
    } else if (membership.role === 'owner') {
        const successor = successors.at(0);
        if (successor && successor.role !== 'owner') {
            await ctx.db.patch('member', successor._id, { role: 'owner' });
        }
    }
    await ctx.db.delete('member', membership._id);
}

async function deleteUserMembershipsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>,
    phase: UserDeletionPhase
): Promise<UserDeletionResult> {
    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const membership of memberships) {
        await transferOrDeleteMembership(ctx, membership, userId);
    }
    if (memberships.length === USER_DELETION_BATCH_SIZE) {
        await scheduleNext(ctx, userId, phase);
        return { status: 'in_progress', phase };
    }
    return { status: 'completed', phase };
}

export async function startUserDeletionCascade(ctx: MutationCtx, userId: Id<'user'>) {
    await anonymizeUser(ctx, userId);
    await scheduleNext(ctx, userId, 'sessions');
}

export async function continueUserDeletionCascade(
    ctx: MutationCtx,
    args: ContinueUserDeletionArgs
): Promise<UserDeletionResult> {
    const phase = args.phase ?? 'sessions';
    switch (phase) {
        case 'sessions':
            return await deleteUserSessionsPhase(ctx, args.userId);
        case 'accounts':
            return await deleteUserAccountsPhase(ctx, args.userId);
        case 'memberships':
            return await deleteUserMembershipsPhase(ctx, args.userId, phase);
    }
}
