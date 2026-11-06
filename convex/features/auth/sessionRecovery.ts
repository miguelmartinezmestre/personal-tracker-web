import {
    buildDefaultOrganizationSlug,
    isPersonalOrganizationForUser,
} from '../organizations/personalOrganization';
import { createPersonalOrganization } from '../organizations/memberships';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';
import { isActiveAccount } from './users';

export const SESSION_RECOVERY_BATCH_SIZE = 20;

type SessionRecoveryPhase = 'actor-null' | 'actor-unset' | 'actor-deleted';

export type SessionRecoveryResult = {
    status: 'in_progress' | 'completed';
    phase: SessionRecoveryPhase;
};

export const NEXT_SESSION_RECOVERY_PHASE: Record<
    SessionRecoveryPhase,
    SessionRecoveryPhase | null
> = {
    'actor-null': 'actor-unset',
    'actor-unset': 'actor-deleted',
    'actor-deleted': null,
};

export function actorPhaseOrganizationId(
    phase: SessionRecoveryPhase,
    organizationId: Id<'organization'>
): Id<'organization'> | null | undefined {
    switch (phase) {
        case 'actor-null':
            return null;
        case 'actor-unset':
            return undefined;
        case 'actor-deleted':
            return organizationId;
    }
}

async function findOrCreateFallbackOrganization(
    ctx: MutationCtx,
    userId: Id<'user'>,
    deletedOrganizationId: Id<'organization'>
): Promise<Id<'organization'> | null> {
    const user = await ctx.db.get('user', userId);

    if (!isActiveAccount(user, Date.now())) {
        return null;
    }

    const personal = await ctx.db
        .query('organization')
        .withIndex('slug', q => q.eq('slug', buildDefaultOrganizationSlug(userId)))
        .first();

    if (
        personal &&
        personal._id !== deletedOrganizationId &&
        isPersonalOrganizationForUser({ metadata: personal.metadata, userId })
    ) {
        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', personal._id).eq('userId', userId)
            )
            .first();

        if (membership) {
            return personal._id;
        }
    }

    for await (const membership of ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))) {
        if (
            membership.organizationId !== deletedOrganizationId &&
            (await ctx.db.get('organization', membership.organizationId))
        ) {
            return membership.organizationId;
        }
    }

    return await createPersonalOrganization(ctx, userId);
}

export async function repairSessionsAfterOrganizationDeletion(
    ctx: MutationCtx,
    sessions: Array<{
        _id: Id<'session'>;
        userId: string;
        expiresAt: number;
    }>,
    deletedOrganizationId: Id<'organization'>
) {
    const fallbackByUser = new Map<string, Id<'organization'> | null>();

    for (const session of sessions) {
        if (session.expiresAt <= Date.now()) {
            await ctx.db.delete('session', session._id);
            continue;
        }

        let fallbackOrganizationId = fallbackByUser.get(session.userId);

        if (fallbackOrganizationId === undefined) {
            const userId = ctx.db.normalizeId('user', session.userId);

            if (userId) {
                fallbackOrganizationId = await findOrCreateFallbackOrganization(
                    ctx,
                    userId,
                    deletedOrganizationId
                );
            } else {
                fallbackOrganizationId = null;
            }

            fallbackByUser.set(session.userId, fallbackOrganizationId);
        }

        if (!fallbackOrganizationId) {
            await ctx.db.delete('session', session._id);
            continue;
        }

        await ctx.db.patch('session', session._id, {
            activeOrganizationId: fallbackOrganizationId,
            updatedAt: Date.now(),
        });
    }
}

export async function scheduleSessionRecovery(
    ctx: MutationCtx,
    args: {
        organizationId: Id<'organization'>;
        actorUserId: Id<'user'>;
        phase: SessionRecoveryPhase;
    }
) {
    await ctx.scheduler.runAfter(0, internal.auth.recoverSessionsAfterOrganizationDeletion, args);
}
