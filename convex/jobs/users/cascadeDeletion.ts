import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    findObjectiveSuccessorOwner,
    reassignOwnedObjective,
} from '../../domain/objectives/collaborators';
import { isPersonalOrganizationForUser } from '../../domain/organizations/personalOrganization';
import { startOrganizationDeletionCascade } from '../organizations/cascadeDeletion';
const USER_DELETION_BATCH_SIZE = 50;
export type UserDeletionPhase =
    | 'sessions'
    | 'accounts'
    | 'objectives'
    | 'collaborators'
    | 'achievements'
    | 'preferences'
    | 'notifications'
    | 'memberships';
type ContinueUserDeletionArgs = {
    userId: Id<'user'>;
    phase?: UserDeletionPhase;
    cursor?: string | null;
};
type UserDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: UserDeletionPhase;
};
async function scheduleNext(ctx: MutationCtx, userId: Id<'user'>, phase: UserDeletionPhase) {
    await ctx.scheduler.runAfter(0, internal.admin.continueUserDeletionCascade, {
        userId,
        phase,
        cursor: null,
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
        nextPhase: 'objectives',
        rowCount: rows.length,
    });
}
async function deleteUserObjectivesPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    // The second index field is a durable per-row checkpoint. It avoids
    // advancing a cursor over an index whose ownerId is being changed.
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_owner_ownerDeletionProcessedAt', q =>
            q.eq('ownerId', userId).eq('ownerDeletionProcessedAt', undefined)
        )
        .take(USER_DELETION_BATCH_SIZE);
    const now = Date.now();
    for (const objective of objectives) {
        const successor = await findObjectiveSuccessorOwner(ctx, objective, userId);
        if (successor) {
            await reassignOwnedObjective(ctx, objective, successor);
            continue;
        }
        const purgeToken =
            objective.purgeToken ?? `user-delete-${String(objective._id)}-${now.toString(36)}`;
        await ctx.db.patch('objectives', objective._id, {
            deletedAt: objective.deletedAt ?? now,
            deletedBy: objective.deletedBy ?? userId,
            purgeToken,
            purgeStartedAt: objective.purgeStartedAt ?? now,
            ownerDeletionProcessedAt: now,
            updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: objective._id,
            purgeToken,
            phase: 'collaborators',
            cursor: null,
            totalProgressDeleted: 0,
            totalNotificationsDeleted: 0,
        });
    }
    if (objectives.length === USER_DELETION_BATCH_SIZE) {
        await scheduleNext(ctx, userId, 'objectives');
        return { status: 'in_progress', phase: 'objectives' };
    }
    await scheduleNext(ctx, userId, 'collaborators');
    return { status: 'in_progress', phase: 'collaborators' };
}
async function deleteUserCollaboratorsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('objectiveCollaborators', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'collaborators',
        nextPhase: 'achievements',
        rowCount: rows.length,
    });
}
async function deleteUserAchievementsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('obtainedAchievements')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('obtainedAchievements', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'achievements',
        nextPhase: 'preferences',
        rowCount: rows.length,
    });
}
async function deleteUserPreferencesPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('notificationPreferences', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'preferences',
        nextPhase: 'notifications',
        rowCount: rows.length,
    });
}
async function deleteUserNotificationsPhase(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<UserDeletionResult> {
    const rows = await ctx.db
        .query('notifications')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('notifications', row._id);
    }
    return await advanceUserDeletionPhase({
        ctx,
        userId,
        currentPhase: 'notifications',
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
              slug: organization.slug,
              userId,
          })
        : false;
    if (organization && (isPersonal || successors.length === 0)) {
        await startOrganizationDeletionCascade(ctx, organization._id, true);
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
        case 'objectives':
            return await deleteUserObjectivesPhase(ctx, args.userId);
        case 'collaborators':
            return await deleteUserCollaboratorsPhase(ctx, args.userId);
        case 'achievements':
            return await deleteUserAchievementsPhase(ctx, args.userId);
        case 'preferences':
            return await deleteUserPreferencesPhase(ctx, args.userId);
        case 'notifications':
            return await deleteUserNotificationsPhase(ctx, args.userId);
        case 'memberships':
            return await deleteUserMembershipsPhase(ctx, args.userId, phase);
    }
}
