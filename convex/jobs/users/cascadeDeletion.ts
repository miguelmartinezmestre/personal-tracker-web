import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    findObjectiveSuccessorOwner,
    reassignOwnedObjective,
} from '../../domain/objectives/collaborators';
import { isPersonalOrganizationForUser } from '../../domain/organizations/personalOrganization';
import { startOrganizationDeletionCascade } from '../organizations/cascadeDeletion';
import { workflow } from '../../workflow';

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

async function scheduleNext(ctx: MutationCtx, userId: Id<'user'>, phase: UserDeletionPhase) {
    await ctx.scheduler.runAfter(0, internal.admin.continueUserDeletionCascade, {
        userId,
        phase,
        cursor: null,
    });
}

async function anonymizeUser(ctx: MutationCtx, userId: Id<'user'>) {
    const user = await ctx.db.get('user', userId);
    if (!user || user.deletedAt !== undefined) return;

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

export async function startUserDeletionCascade(ctx: MutationCtx, userId: Id<'user'>) {
    await anonymizeUser(ctx, userId);
    await scheduleNext(ctx, userId, 'sessions');
}

export async function continueUserDeletionCascade(
    ctx: MutationCtx,
    args: ContinueUserDeletionArgs
): Promise<{ status: 'in_progress' | 'completed'; phase: UserDeletionPhase }> {
    const phase = args.phase ?? 'sessions';

    if (phase === 'sessions') {
        const rows = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('session', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'accounts';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'accounts') {
        const rows = await ctx.db
            .query('account')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('account', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'objectives';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'objectives') {
        // The second index field is a durable per-row checkpoint. It avoids
        // advancing a cursor over an index whose ownerId is being changed.
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_owner_ownerDeletionProcessedAt', q =>
                q.eq('ownerId', args.userId).eq('ownerDeletionProcessedAt', undefined)
            )
            .take(USER_DELETION_BATCH_SIZE);
        const now = Date.now();

        for (const objective of objectives) {
            const successor = await findObjectiveSuccessorOwner(ctx, objective, args.userId);
            if (successor) {
                await reassignOwnedObjective(ctx, objective, successor);
            } else {
                if (objective.workflowId) {
                    await workflow.cancel(ctx, objective.workflowId);
                }

                const purgeToken =
                    objective.purgeToken ??
                    `user-delete-${String(objective._id)}-${now.toString(36)}`;
                await ctx.db.patch('objectives', objective._id, {
                    deletedAt: objective.deletedAt ?? now,
                    deletedBy: objective.deletedBy ?? args.userId,
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
        }

        if (objectives.length === USER_DELETION_BATCH_SIZE) {
            await scheduleNext(ctx, args.userId, phase);
            return { status: 'in_progress', phase };
        }

        await scheduleNext(ctx, args.userId, 'collaborators');
        return { status: 'in_progress', phase: 'collaborators' };
    }

    if (phase === 'collaborators') {
        const rows = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('objectiveCollaborators', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'achievements';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'achievements') {
        const rows = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('obtainedAchievements', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'preferences';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'preferences') {
        const rows = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('notificationPreferences', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'notifications';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'notifications') {
        const rows = await ctx.db
            .query('notifications')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .take(USER_DELETION_BATCH_SIZE);
        for (const row of rows) {
            await ctx.db.delete('notifications', row._id);
        }
        const next = rows.length === USER_DELETION_BATCH_SIZE ? phase : 'memberships';
        await scheduleNext(ctx, args.userId, next);
        return { status: 'in_progress', phase: next };
    }

    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', args.userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const membership of memberships) {
        const organization = await ctx.db.get('organization', membership.organizationId);
        const otherMembers = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', membership.organizationId))
            .take(USER_DELETION_BATCH_SIZE + 1);
        const successors = otherMembers
            .filter(member => member.userId !== args.userId)
            .sort((a, b) => a.createdAt - b.createdAt);
        const isPersonal = organization
            ? isPersonalOrganizationForUser({
                  metadata: organization.metadata,
                  slug: organization.slug,
                  userId: args.userId,
              })
            : false;

        if (organization && (isPersonal || successors.length === 0)) {
            await startOrganizationDeletionCascade(ctx, organization._id, true);
        } else if (membership.role === 'owner' && successors[0]?.role !== 'owner') {
            await ctx.db.patch('member', successors[0]!._id, { role: 'owner' });
        }

        await ctx.db.delete('member', membership._id);
    }

    if (memberships.length === USER_DELETION_BATCH_SIZE) {
        await scheduleNext(ctx, args.userId, phase);
        return { status: 'in_progress', phase };
    }

    return { status: 'completed', phase };
}
