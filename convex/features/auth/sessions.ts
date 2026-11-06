import { ConvexError } from 'convex/values';
import type { PaginationOptions } from 'convex/server';
import { internal } from '../../_generated/api';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import {
    deleteById,
    deleteWhere,
    findMany,
    findOne,
    findPage,
    patchById,
    type AuthDoc,
    type AuthReader,
    type AuthWriter,
} from './authStore';
import {
    getMembership,
    getMembershipRole,
    getOrganization,
    getSession,
    getUser,
} from './authRecords';
import { isActiveAccount } from './users';
import { createPersonalOrganization, listUserMemberships } from '../organizations/memberships';
import {
    buildDefaultOrganizationSlug,
    isPersonalOrganizationForUser,
} from '../organizations/personalOrganization';

export const SESSION_REVOCATION_BATCH_SIZE = 100;

const SESSION_RECOVERY_BATCH_SIZE = 20;

export async function currentSessionId(ctx: Pick<QueryCtx, 'auth'>) {
    const identity = await ctx.auth.getUserIdentity();

    if (typeof identity?.sessionId !== 'string') {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    return identity.sessionId;
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

    const activeOrganizationId = (await getMembershipRole(
        ctx,
        session.activeOrganizationId,
        user._id
    ))
        ? (session.activeOrganizationId ?? null)
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
    const result = await findPage(ctx, 'session', {
        where: [{ field: 'userId', value: args.userId }],
        sortBy: { field: 'createdAt', direction: 'desc' },
        paginationOpts: args.paginationOpts,
    });

    return {
        ...result,
        page: result.page.map(session => ({
            id: session._id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress ?? null,
            userAgent: session.userAgent ?? null,
            isCurrent: session._id === args.currentSessionId,
        })),
    };
}

/** Deletes one session; when `userId` is given it must own the session. */
export async function removeSession(ctx: AuthWriter, sessionId: string, userId?: string) {
    const session = await getSession(ctx, sessionId);

    if (!session || (userId !== undefined && session.userId !== userId)) {
        return null;
    }

    await deleteById(ctx, 'session', session._id);

    return { id: session._id, userId: session.userId };
}

/** Deletes up to `batchSize` sessions of the user, except `keepSessionId`. */
export async function removeSessionsForUserBatch(
    ctx: AuthWriter,
    args: { userId: string; keepSessionId?: string; batchSize: number }
) {
    const { count, remaining } = await deleteWhere(
        ctx,
        'session',
        [
            { field: 'userId', value: args.userId },
            ...(args.keepSessionId
                ? [{ field: '_id', operator: 'not_in' as const, value: [args.keepSessionId] }]
                : []),
        ],
        args.batchSize
    );

    return { deleted: count, remaining };
}

export async function revokeOtherSessionsBatch(
    ctx: AuthWriter & Pick<MutationCtx, 'scheduler'>,
    args: { userId: string; keepSessionId: string }
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
    args: { userId: string; banUpdatedAt: number }
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
    args: { userId: string; organizationId: string; replaceOrganizationIds: string[] }
) {
    const replaceable = new Set(args.replaceOrganizationIds);
    let cursor: string | null = null;

    // Patches keep each session at its place in the userId index, so the cursor stays valid.
    for (;;) {
        const result: Awaited<ReturnType<typeof findMany<'session'>>> = await findMany(
            ctx,
            'session',
            {
                where: [{ field: 'userId', value: args.userId }],
                paginationOpts: { numItems: 100, cursor },
            }
        );

        for (const session of result.page) {
            const current = await getOrganization(ctx, session.activeOrganizationId);

            if (!current || replaceable.has(current._id)) {
                await patchById(ctx, 'session', session._id, {
                    activeOrganizationId: args.organizationId,
                });
            }
        }

        if (result.isDone) {
            return;
        }

        cursor = result.continueCursor;
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

    const personal = await findOne(ctx, 'organization', [
        { field: 'slug', value: buildDefaultOrganizationSlug(user._id) },
    ]);

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
    sessions: AuthDoc<'session'>[],
    deletedOrganizationId: string
) {
    const fallbackByUser = new Map<string, string | null>();

    for (const session of sessions) {
        if (session.expiresAt <= Date.now()) {
            await deleteById(ctx, 'session', session._id);
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
            await deleteById(ctx, 'session', session._id);
            continue;
        }

        await patchById(ctx, 'session', session._id, {
            activeOrganizationId: fallbackOrganizationId,
            updatedAt: Date.now(),
        });
    }
}

export type ActorSessionRecoveryStep = {
    phase: 'actor-cleared' | 'actor-deleted';
    cursor: string | null;
};

/**
 * Better Auth clears the active organization of the actor's sessions when it deletes an
 * organization. One batch of the walk over those sessions (cleared, then still pointing at the
 * deleted organization), moving each one to another organization of its user. Returns the next
 * step, or null when done.
 */
export async function recoverActorSessionsBatch(
    ctx: AuthWriter,
    args: { organizationId: string; actorUserId: string; step: ActorSessionRecoveryStep }
): Promise<ActorSessionRecoveryStep | null> {
    const { phase, cursor } = args.step;

    const result = await findMany(ctx, 'session', {
        where: [
            { field: 'userId', value: args.actorUserId },
            {
                field: 'activeOrganizationId',
                value: phase === 'actor-cleared' ? null : args.organizationId,
            },
        ],
        // Repaired sessions leave the deleted organization's range, so that walk restarts.
        paginationOpts: {
            numItems: SESSION_RECOVERY_BATCH_SIZE,
            cursor: phase === 'actor-cleared' ? cursor : null,
        },
    });

    await repairSessions(ctx, result.page, args.organizationId);

    if (!result.isDone) {
        return { phase, cursor: result.continueCursor };
    }

    return phase === 'actor-cleared' ? { phase: 'actor-deleted', cursor: null } : null;
}

/** Moves the sessions of every user that still points at a deleted organization. */
export async function recoverSessionsForDeletedOrganization(
    ctx: AuthWriter,
    organizationId: string
) {
    if (await getOrganization(ctx, organizationId)) {
        return { remaining: false };
    }

    const result = await findMany(ctx, 'session', {
        where: [{ field: 'activeOrganizationId', value: organizationId }],
        paginationOpts: { numItems: SESSION_RECOVERY_BATCH_SIZE, cursor: null },
    });

    await repairSessions(ctx, result.page, organizationId);

    return { remaining: !result.isDone };
}

export async function hasSessionsInOrganization(ctx: AuthReader, organizationId: string) {
    return (
        (await findOne(ctx, 'session', [
            { field: 'activeOrganizationId', value: organizationId },
        ])) !== null
    );
}
