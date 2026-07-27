import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, type MutationCtx } from './_generated/server';
import { requireAdmin } from './utils/requiredAdmin';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { toSessionListItem } from './sessions';
import { ERROR_CODES } from './utils/constants';
import { isPlatformSetupUser } from './platform/setup/bootstrap';
import type { Id } from './_generated/dataModel';
import {
    continueUserDeletionCascade as continueUserDeletionCascadeJob,
    startUserDeletionCascade,
} from './jobs/users/cascadeDeletion';
import {
    continueOrganizationDeletionCascade as continueOrganizationDeletionCascadeJob,
    startOrganizationDeletionCascade,
} from './jobs/organizations/cascadeDeletion';
import { continueMemberLeaveCleanup as continueMemberLeaveCleanupJob } from './jobs/organizations/memberLeaveCleanup';
import { paginatedSessionsValidator, paginatedUsersValidator } from './utils/apiReturnValidators';
import { withInvalidCursorRetry } from './utils/pagination';
import { resolveActorUserId, sanitizeAuditMetadata } from './domain/audit/privacy';
import { GLOBAL_ADMIN_ROLE, USER_ROLE, isGlobalAdminRole } from '../shared/platform-roles';
import { USER_EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from '../shared/input-constraints';
import { normalizeRequiredBoundedString } from './utils/inputValidation';

const SESSION_REVOKE_BATCH_SIZE = 100;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

type SessionRevocationBatchResult = {
    status: 'in_progress' | 'completed';
    revokedCount: number;
};

export async function revokeAllSessionsForUser(
    ctx: MutationCtx,
    userId: Id<'user'>,
    totalRevoked = 0,
    expectedBanUpdatedAt?: number
): Promise<SessionRevocationBatchResult> {
    if (expectedBanUpdatedAt !== undefined) {
        const user = await ctx.db.get('user', userId);
        const activeBan =
            user?.banned === true && (user.banExpires == null || user.banExpires > Date.now());
        if (!user || !activeBan || user.updatedAt !== expectedBanUpdatedAt) {
            return { status: 'completed', revokedCount: totalRevoked };
        }
    }

    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(SESSION_REVOKE_BATCH_SIZE + 1);
    const batch = sessions.slice(0, SESSION_REVOKE_BATCH_SIZE);

    for (const session of batch) {
        await ctx.db.delete(session._id);
    }

    const revokedCount = totalRevoked + batch.length;
    if (sessions.length > batch.length) {
        await ctx.scheduler.runAfter(0, internal.admin.continueUserSessionRevocation, {
            userId,
            totalRevoked: revokedCount,
            ...(expectedBanUpdatedAt !== undefined ? { expectedBanUpdatedAt } : {}),
        });
        return { status: 'in_progress', revokedCount };
    }

    return { status: 'completed', revokedCount };
}

function getBanExpiresAt(now: number, banExpiresInSeconds: number | undefined): number | null {
    if (banExpiresInSeconds === undefined) return null;

    if (
        !Number.isFinite(banExpiresInSeconds) ||
        !Number.isSafeInteger(banExpiresInSeconds) ||
        banExpiresInSeconds <= 0
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    const durationMs = banExpiresInSeconds * 1000;
    const expiresAt = now + durationMs;
    if (
        !Number.isSafeInteger(durationMs) ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt > MAX_DATE_TIMESTAMP
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    return expiresAt;
}

function getNextUpdatedAt(currentUpdatedAt: number): number {
    return Math.max(Date.now(), currentUpdatedAt + 1);
}

export const listUsers = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
        searchValue: v.optional(v.string()),
    },
    returns: paginatedUsersValidator,
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const search = args.searchValue?.trim();
        const result = await withInvalidCursorRetry(args.paginationOpts, paginationOpts =>
            search
                ? search.includes('@')
                    ? ctx.db
                          .query('user')
                          .withSearchIndex('search_user_email', q => q.search('email', search))
                          .paginate(paginationOpts)
                    : ctx.db
                          .query('user')
                          .withSearchIndex('search_user_name', q => q.search('name', search))
                          .paginate(paginationOpts)
                : ctx.db.query('user').withIndex('email_name').paginate(paginationOpts)
        );

        return {
            ...result,
            page: result.page.filter(user => user.deletedAt === undefined),
        };
    },
});

export const updateUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
        name: v.string(),
        email: v.string(),
        role: v.union(v.literal(GLOBAL_ADMIN_ROLE), v.literal(USER_ROLE)),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const target = await ctx.db.get('user', args.userId);
        if (!target || target.deletedAt !== undefined) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }

        const name = normalizeRequiredBoundedString(args.name, USER_NAME_MAX_LENGTH);
        const email = normalizeRequiredBoundedString(
            args.email,
            USER_EMAIL_MAX_LENGTH
        ).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const changesRole = target.role !== args.role;
        if (changesRole && args.userId === ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        if (
            changesRole &&
            args.role !== GLOBAL_ADMIN_ROLE &&
            (await isPlatformSetupUser(ctx, args.userId))
        ) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        if (isGlobalAdminRole(target.role) && args.role !== GLOBAL_ADMIN_ROLE) {
            const admins = await ctx.db
                .query('user')
                .withIndex('by_role', q => q.eq('role', GLOBAL_ADMIN_ROLE))
                .take(2);
            if (!admins.some(admin => admin._id !== args.userId)) {
                throw new ConvexError(ERROR_CODES.FORBIDDEN);
            }
        }

        const emailOwner = await ctx.db
            .query('user')
            .withIndex('email_name', q => q.eq('email', email))
            .first();
        if (emailOwner && emailOwner._id !== args.userId) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        await ctx.db.patch('user', args.userId, {
            name,
            email,
            role: args.role,
            updatedAt: getNextUpdatedAt(target.updatedAt),
        });

        return { success: true };
    },
});

export const banUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
        banReason: v.optional(v.string()),
        // Ban duration in **seconds from now** (better-auth `banExpiresIn`), not
        // an absolute timestamp. Omit for a permanent ban.
        banExpiresInSeconds: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        // The platform setup account must remain usable — mirror the delete guard.
        if (await isPlatformSetupUser(ctx, args.userId)) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_BAN_FORBIDDEN);
        }

        if (args.userId === ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const targetUser = await ctx.db.get('user', args.userId);
        if (!targetUser) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }

        const now = Date.now();
        const banUpdatedAt = getNextUpdatedAt(targetUser.updatedAt);
        await ctx.db.patch('user', args.userId, {
            banned: true,
            banReason: args.banReason || 'No reason',
            banExpires: getBanExpiresAt(now, args.banExpiresInSeconds),
            updatedAt: banUpdatedAt,
        });

        // The durable status above blocks application access immediately. The
        // physical session rows can therefore be removed safely in batches.
        await revokeAllSessionsForUser(ctx, args.userId, 0, banUpdatedAt);

        return { success: true };
    },
});

export const continueUserSessionRevocation = internalMutation({
    args: {
        userId: v.id('user'),
        totalRevoked: v.optional(v.number()),
        expectedBanUpdatedAt: v.optional(v.number()),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        revokedCount: v.number(),
    }),
    handler: async (ctx, args): Promise<SessionRevocationBatchResult> => {
        return await revokeAllSessionsForUser(
            ctx,
            args.userId,
            args.totalRevoked ?? 0,
            args.expectedBanUpdatedAt
        );
    },
});

export const unbanUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const targetUser = await ctx.db.get('user', args.userId);
        if (!targetUser) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }

        await ctx.db.patch('user', args.userId, {
            banned: false,
            banReason: null,
            banExpires: null,
            updatedAt: getNextUpdatedAt(targetUser.updatedAt),
        });

        return { success: true };
    },
});

export const deleteUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        if (await isPlatformSetupUser(ctx, args.userId)) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN);
        }

        if (args.userId === ctx.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.runMutation(internal.admin.cascadeUserDeletionInternal, {
            userId: args.userId,
            actorUserId: ctx.userId,
        });

        return { success: true };
    },
});

export const revokeUserSession = mutationWithRLS({
    args: {
        userId: v.id('user'),
        sessionId: v.id('session'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== args.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.db.delete(args.sessionId);

        return { success: true };
    },
});

/**
 * Anonymizes a deleted account and cleans up its private/operational data in
 * bounded jobs. The anonymized user row is intentionally retained as a
 * tombstone so provenance fields never point at a non-existent document.
 */
export const cascadeUserDeletionInternal = internalMutation({
    args: {
        userId: v.id('user'),
        actorUserId: v.optional(v.id('user')),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await ctx.db.get('user', args.userId);
        if (!user) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }
        if (await isPlatformSetupUser(ctx, args.userId)) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN);
        }

        const wasAlreadyDeleted = user.deletedAt !== undefined;
        const externalActorUserId =
            args.actorUserId && args.actorUserId !== args.userId ? args.actorUserId : null;
        const actorMembership =
            !wasAlreadyDeleted && externalActorUserId
                ? await ctx.db
                      .query('member')
                      .withIndex('userId', q => q.eq('userId', externalActorUserId))
                      .first()
                : null;
        const subjectMembership = !wasAlreadyDeleted
            ? await ctx.db
                  .query('member')
                  .withIndex('userId', q => q.eq('userId', args.userId))
                  .first()
            : null;
        const auditOrganizationId =
            actorMembership?.organizationId ?? subjectMembership?.organizationId;

        await startUserDeletionCascade(ctx, args.userId);

        if (auditOrganizationId) {
            const tombstone = await ctx.db.get('user', args.userId);
            const metadata = sanitizeAuditMetadata('user', {
                before: {
                    _id: user._id,
                    emailVerified: user.emailVerified,
                    role: user.role ?? null,
                    banned: user.banned ?? null,
                    banExpires: user.banExpires ?? null,
                    deletedAt: user.deletedAt ?? null,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                after: tombstone
                    ? {
                          _id: tombstone._id,
                          emailVerified: tombstone.emailVerified,
                          role: tombstone.role ?? null,
                          banned: tombstone.banned ?? null,
                          banExpires: tombstone.banExpires ?? null,
                          deletedAt: tombstone.deletedAt ?? null,
                          createdAt: tombstone.createdAt,
                          updatedAt: tombstone.updatedAt,
                      }
                    : undefined,
                context: 'soft_delete',
            });

            await ctx.db.insert('auditLogs', {
                userId: args.userId,
                actorUserId: resolveActorUserId(args.userId, args.actorUserId),
                organizationId: auditOrganizationId,
                action: 'user.deleted',
                resourceType: 'user',
                resourceId: String(args.userId),
                metadata,
                severity: 'info',
                createdAt: Date.now(),
            });
        }

        return null;
    },
});

const userDeletionPhaseValidator = v.union(
    v.literal('sessions'),
    v.literal('accounts'),
    v.literal('objectives'),
    v.literal('collaborators'),
    v.literal('achievements'),
    v.literal('preferences'),
    v.literal('notifications'),
    v.literal('memberships')
);

export const continueUserDeletionCascade = internalMutation({
    args: {
        userId: v.id('user'),
        phase: v.optional(userDeletionPhaseValidator),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: userDeletionPhaseValidator,
    }),
    handler: continueUserDeletionCascadeJob,
});

const organizationDeletionPhaseValidator = v.union(
    v.literal('collaborators'),
    v.literal('progress'),
    v.literal('notifications'),
    v.literal('objectives'),
    v.literal('categories'),
    v.literal('achievements'),
    v.literal('audit'),
    v.literal('invitations'),
    v.literal('memberships'),
    v.literal('finalize')
);

export const cascadeOrganizationDeletionInternal = internalMutation({
    args: {
        organizationId: v.id('organization'),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await startOrganizationDeletionCascade(ctx, args.organizationId);
        return null;
    },
});

export const continueOrganizationDeletionCascade = internalMutation({
    args: {
        organizationId: v.id('organization'),
        phase: v.optional(organizationDeletionPhaseValidator),
        deleteOrganizationRecord: v.optional(v.boolean()),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: organizationDeletionPhaseValidator,
    }),
    handler: continueOrganizationDeletionCascadeJob,
});

const memberLeaveCleanupPhaseValidator = v.union(
    v.literal('collaborators'),
    v.literal('objectives')
);

export const continueMemberLeaveCleanup = internalMutation({
    args: {
        organizationId: v.id('organization'),
        userId: v.id('user'),
        phase: v.optional(memberLeaveCleanupPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: memberLeaveCleanupPhaseValidator,
    }),
    handler: continueMemberLeaveCleanupJob,
});

export const listUserSessions = queryWithRLS({
    args: {
        userId: v.id('user'),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedSessionsValidator,
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const result = await withInvalidCursorRetry(args.paginationOpts, paginationOpts =>
            ctx.db
                .query('session')
                .withIndex('userId', q => q.eq('userId', args.userId))
                .order('desc')
                .paginate(paginationOpts)
        );

        return {
            ...result,
            page: result.page.map(session => toSessionListItem(session, null)),
        };
    },
});
