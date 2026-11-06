import { ConvexError } from 'convex/values';
import type { PaginationOptions } from 'convex/server';
import { getSession as getKitcnSession } from 'kitcn/auth';
import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { withNextPageCheck, withPaginationLimits } from '../../shared/pagination';
import {
    getMembership,
    getOrganization,
    getSession,
    getUser,
    type AuthReader,
    type AuthWriter,
} from './authRecords';
import { isActiveAccount } from './users';
import { createPersonalOrganization, listUserMemberships } from '../organizations/memberships';
import {
    buildDefaultOrganizationSlug,
    isPersonalOrganizationForUser,
} from '../organizations/personalOrganization';

export const SESSION_REVOCATION_BATCH_SIZE = 100;

const SESSION_RECOVERY_BATCH_SIZE = 20;

export async function currentSessionId(ctx: QueryCtx) {
    const session = await getKitcnSession(ctx);

    if (!session) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    return session._id;
}

export async function readCurrentSession(ctx: AuthReader, sessionId: string) {
    const now = Date.now();
    const session = await getSession(ctx, sessionId);

    if (!session || session.expiresAt <= now) {
        return null;
    }

    const user = await getUser(ctx, session.userId);

    if (!user || !isActiveAccount(user, now)) {
        return null;
    }

    const organization = await getOrganization(ctx, session.activeOrganizationId);

    const activeOrganizationId =
        organization && (await getMembership(ctx, organization._id, user._id))
            ? organization._id
            : null;

    return {
        session: {
            id: session._id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            activeOrganizationId,
            createdAt: session.createdAt,
        },
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified,
        },
    };
}

export async function listSessionsForUser(
    ctx: AuthReader,
    args: { userId: string; currentSessionId: string | null; paginationOpts: PaginationOptions }
) {
    const userId = ctx.db.normalizeId('user', args.userId);

    if (!userId) {
        return { page: [], isDone: true, continueCursor: '' };
    }

    const result = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .order('desc')
        .paginate(withPaginationLimits(args.paginationOpts));

    return await withNextPageCheck(
        ctx.db,
        {
            table: 'session',
            index: 'userId',
            prefix: [userId],
            indexKey: doc => [doc.userId],
            paginationOpts: args.paginationOpts,
        },
        result,
        result.page.map(session => ({
            id: session._id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress ?? null,
            userAgent: session.userAgent ?? null,
            isCurrent: session._id === args.currentSessionId,
        }))
    );
}

/** Deletes one session; when `userId` is given it must own the session. */
export async function removeSession(ctx: AuthWriter, sessionId: string, userId?: string) {
    const session = await getSession(ctx, sessionId);

    if (!session || (userId !== undefined && session.userId !== userId)) {
        return null;
    }

    await ctx.db.delete('session', session._id);

    return { id: session._id, userId: session.userId };
}

/** Deletes up to `batchSize` sessions of the user, except `keepSessionId`. */
export async function removeSessionsForUserBatch(
    ctx: AuthWriter,
    args: { userId: string; keepSessionId?: string; batchSize: number }
) {
    const userId = ctx.db.normalizeId('user', args.userId);

    if (!userId) {
        return { deleted: 0, remaining: false };
    }

    // One extra row tells whether more remain; another covers the kept session.
    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(args.batchSize + 2);

    const others = sessions.filter(session => session._id !== args.keepSessionId);
    const batch = others.slice(0, args.batchSize);

    for (const session of batch) {
        await ctx.db.delete('session', session._id);
    }

    return { deleted: batch.length, remaining: others.length > batch.length };
}

export async function revokeOtherSessionsBatch(
    ctx: AuthWriter & Pick<MutationCtx, 'scheduler'>,
    args: { userId: Id<'user'>; keepSessionId: Id<'session'> }
) {
    const { deleted, remaining } = await removeSessionsForUserBatch(ctx, {
        ...args,
        batchSize: SESSION_REVOCATION_BATCH_SIZE,
    });

    if (remaining) {
        await ctx.scheduler.runAfter(0, internal.sessions.continueSessionRevocation, args);
    }

    return deleted;
}

export async function revokeBannedUserSessionsBatch(
    ctx: AuthWriter & Pick<MutationCtx, 'scheduler'>,
    args: { userId: Id<'user'>; banUpdatedAt: number }
) {
    const user = await getUser(ctx, args.userId);

    if (user?.banned !== true || user.updatedAt !== args.banUpdatedAt) {
        return;
    }

    const { remaining } = await removeSessionsForUserBatch(ctx, {
        userId: args.userId,
        batchSize: SESSION_REVOCATION_BATCH_SIZE,
    });

    if (remaining) {
        await ctx.scheduler.runAfter(0, internal.admin.continueBanSessionRevocation, args);
    }
}

/** Points every session of the user that has no usable organization at `organizationId`. */
export async function activateOrganizationForUser(
    ctx: AuthWriter,
    args: { userId: string; organizationId: Id<'organization'>; replaceOrganizationIds: string[] }
) {
    const userId = ctx.db.normalizeId('user', args.userId);

    if (!userId) {
        return;
    }

    const replaceable = new Set(args.replaceOrganizationIds);

    // Read every session before patching any, so the writes do not affect the iteration.
    const sessions: Doc<'session'>[] = [];

    for await (const session of ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))) {
        sessions.push(session);
    }

    for (const session of sessions) {
        const current = await getOrganization(ctx, session.activeOrganizationId);

        if (!current || replaceable.has(current._id)) {
            await ctx.db.patch('session', session._id, {
                activeOrganizationId: args.organizationId,
            });
        }
    }
}

async function findOrCreateFallbackOrganization(
    ctx: AuthWriter,
    userId: string,
    deletedOrganizationId: string
) {
    const user = await getUser(ctx, userId);

    if (!user || !isActiveAccount(user, Date.now())) {
        return null;
    }

    const personal = await ctx.db
        .query('organization')
        .withIndex('slug', q => q.eq('slug', buildDefaultOrganizationSlug(user._id)))
        .first();

    if (
        personal &&
        personal._id !== deletedOrganizationId &&
        isPersonalOrganizationForUser({ metadata: personal.metadata, userId: user._id }) &&
        (await getMembership(ctx, personal._id, user._id))
    ) {
        return personal._id;
    }

    for (const membership of await listUserMemberships(ctx, user._id)) {
        if (
            membership.organizationId !== deletedOrganizationId &&
            (await getOrganization(ctx, membership.organizationId))
        ) {
            return membership.organizationId;
        }
    }

    return await createPersonalOrganization(ctx, user._id);
}

async function repairSessions(
    ctx: AuthWriter,
    sessions: Doc<'session'>[],
    deletedOrganizationId: string
) {
    const fallbackByUser = new Map<string, Id<'organization'> | null>();

    for (const session of sessions) {
        if (session.expiresAt <= Date.now()) {
            await ctx.db.delete('session', session._id);
            continue;
        }

        let fallbackOrganizationId = fallbackByUser.get(session.userId);

        if (fallbackOrganizationId === undefined) {
            fallbackOrganizationId = await findOrCreateFallbackOrganization(
                ctx,
                session.userId,
                deletedOrganizationId
            );
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

/**
 * Better Auth clears the active organization of the actor's sessions when it deletes an
 * organization: to null, or by removing the field, so both are walked before the sessions that
 * still point at the deleted organization.
 */
export type ActorSessionRecoveryPhase = 'actor-null' | 'actor-unset' | 'actor-deleted';

const NEXT_ACTOR_PHASE: Record<ActorSessionRecoveryPhase, ActorSessionRecoveryPhase | null> = {
    'actor-null': 'actor-unset',
    'actor-unset': 'actor-deleted',
    'actor-deleted': null,
};

function actorPhaseOrganizationId(
    phase: ActorSessionRecoveryPhase,
    organizationId: Id<'organization'>
) {
    switch (phase) {
        case 'actor-null':
            return null;
        case 'actor-unset':
            return undefined;
        case 'actor-deleted':
            return organizationId;
    }
}

/**
 * One batch of the walk over the actor's sessions, moving each one to another organization of
 * its user. Returns the phase to run next (the same one while it has rows left), or null when
 * done. Repaired sessions leave the queried range, so every batch reads from the start.
 */
export async function recoverActorSessionsBatch(
    ctx: AuthWriter,
    args: { organizationId: string; actorUserId: string; phase: ActorSessionRecoveryPhase }
): Promise<ActorSessionRecoveryPhase | null> {
    const organizationId = ctx.db.normalizeId('organization', args.organizationId);
    const actorUserId = ctx.db.normalizeId('user', args.actorUserId);

    if (!organizationId || !actorUserId) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    const activeOrganizationId = actorPhaseOrganizationId(args.phase, organizationId);

    const sessions = await ctx.db
        .query('session')
        .withIndex('by_userId_and_activeOrganizationId', q =>
            q.eq('userId', actorUserId).eq('activeOrganizationId', activeOrganizationId)
        )
        .take(SESSION_RECOVERY_BATCH_SIZE);

    await repairSessions(ctx, sessions, organizationId);

    return sessions.length === SESSION_RECOVERY_BATCH_SIZE
        ? args.phase
        : NEXT_ACTOR_PHASE[args.phase];
}

/** Moves the sessions of every user that still points at a deleted organization. */
export async function recoverSessionsForDeletedOrganization(
    ctx: AuthWriter,
    organizationId: string
) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id || (await getOrganization(ctx, id))) {
        return { remaining: false };
    }

    const sessions = await ctx.db
        .query('session')
        .withIndex('activeOrganizationId', q => q.eq('activeOrganizationId', id))
        .take(SESSION_RECOVERY_BATCH_SIZE);

    await repairSessions(ctx, sessions, id);

    return { remaining: sessions.length === SESSION_RECOVERY_BATCH_SIZE };
}

export async function hasSessionsInOrganization(ctx: AuthReader, organizationId: string) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id) {
        return false;
    }

    const session = await ctx.db
        .query('session')
        .withIndex('activeOrganizationId', q => q.eq('activeOrganizationId', id))
        .first();

    return session !== null;
}
