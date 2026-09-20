import { internalMutation } from './platform/db/internalMutation';
import { requireAdminTarget, assertAnotherActiveAdministrator } from './domain/adminCapabilities';
import { paginationOptsValidator, type PaginationOptions } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { type MutationCtx, type QueryCtx } from './_generated/server';
import { requireAdmin } from './utils/requiredAdmin';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { toSessionListItem } from './sessions';
import { ERROR_CODES } from './utils/constants';
import { isPlatformSetupUser } from './platform/admin/access';
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
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from '../shared/platform-roles';
import { USER_EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from '../shared/input-constraints';
import { normalizeRequiredBoundedString } from './utils/inputValidation';
const SESSION_REVOKE_BATCH_SIZE = 100;
const MAX_DATE_TIMESTAMP = 8640000000000000;
export async function revokeAllSessionsForUser(
    ctx: MutationCtx,
    userId: Id<'user'>,
    expectedBanUpdatedAt?: number
): Promise<void> {
    if (expectedBanUpdatedAt !== undefined) {
        const user = await ctx.db.get('user', userId);
        const activeBan =
            user?.banned === true && (user.banExpires == null || user.banExpires > Date.now());
        if (!user || !activeBan || user.updatedAt !== expectedBanUpdatedAt) {
            return;
        }
    }
    const sessions = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(SESSION_REVOKE_BATCH_SIZE + 1);
    const batch = sessions.slice(0, SESSION_REVOKE_BATCH_SIZE);
    for (const session of batch) {
        await ctx.db.delete('session', session._id);
    }
    if (sessions.length > batch.length) {
        await ctx.scheduler.runAfter(0, internal.admin.continueUserSessionRevocation, {
            userId,
            ...(expectedBanUpdatedAt !== undefined ? { expectedBanUpdatedAt } : {}),
        });
    }
}
function getBanExpiresAt(now: number, banExpiresInSeconds: number | undefined): number | null {
    if (banExpiresInSeconds === undefined) {
        return null;
    }
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
function queryUsersPage(
    ctx: {
        db: QueryCtx['db'];
    },
    search: string | undefined,
    paginationOpts: PaginationOptions
) {
    if (!search) {
        return ctx.db.query('user').withIndex('email_name').paginate(paginationOpts);
    }
    if (search.includes('@')) {
        return ctx.db
            .query('user')
            .withSearchIndex('search_user_email', q => q.search('email', search))
            .paginate(paginationOpts);
    }
    return ctx.db
        .query('user')
        .withSearchIndex('search_user_name', q => q.search('name', search))
        .paginate(paginationOpts);
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
            queryUsersPage(ctx, search, paginationOpts)
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
        const target = await requireAdminTarget(ctx, args.userId, 'update', args.role);
        const name = normalizeRequiredBoundedString(args.name, USER_NAME_MAX_LENGTH);
        const email = normalizeRequiredBoundedString(
            args.email,
            USER_EMAIL_MAX_LENGTH
        ).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
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
        const targetUser = await requireAdminTarget(ctx, args.userId, 'ban');
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
        await revokeAllSessionsForUser(ctx, args.userId, banUpdatedAt);
        return { success: true };
    },
});
export const continueUserSessionRevocation = internalMutation({
    args: {
        userId: v.id('user'),
        expectedBanUpdatedAt: v.optional(v.number()),
    },
    returns: v.null(),
    handler: async (ctx, args): Promise<null> => {
        await revokeAllSessionsForUser(ctx, args.userId, args.expectedBanUpdatedAt);
        return null;
    },
});
export const unbanUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        const targetUser = await requireAdminTarget(ctx, args.userId, 'unban');
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
        await requireAdminTarget(ctx, args.userId, 'delete');
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
        await requireAdminTarget(ctx, args.userId, 'sessions');
        const session = await ctx.db.get('session', args.sessionId);
        if (!session || session.userId !== args.userId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        await ctx.db.delete('session', args.sessionId);
        return { success: true };
    },
});
export const revokeAllUserSessions = mutationWithRLS({
    args: { userId: v.id('user') },
    returns: v.null(),
    handler: async (ctx, args): Promise<null> => {
        await requireAdminTarget(ctx, args.userId, 'sessions');
        await revokeAllSessionsForUser(ctx, args.userId);
        return null;
    },
});
async function resolveUserDeletionAuditOrganizationId(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        actorUserId?: Id<'user'>;
        wasAlreadyDeleted: boolean;
    }
) {
    const externalActorUserId =
        args.actorUserId && args.actorUserId !== args.userId ? args.actorUserId : null;
    const actorMembership =
        !args.wasAlreadyDeleted && externalActorUserId
            ? await ctx.db
                  .query('member')
                  .withIndex('userId', q => q.eq('userId', externalActorUserId))
                  .first()
            : null;
    const subjectMembership = !args.wasAlreadyDeleted
        ? await ctx.db
              .query('member')
              .withIndex('userId', q => q.eq('userId', args.userId))
              .first()
        : null;
    return actorMembership?.organizationId ?? subjectMembership?.organizationId;
}
function userAuditSnapshot(user: {
    _id: Id<'user'>;
    emailVerified: boolean;
    role?: string | null;
    banned?: boolean | null;
    banExpires?: number | null;
    deletedAt?: number;
    createdAt: number;
    updatedAt: number;
}) {
    return {
        _id: user._id,
        emailVerified: user.emailVerified,
        role: user.role ?? null,
        banned: user.banned ?? null,
        banExpires: user.banExpires ?? null,
        deletedAt: user.deletedAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
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
        await assertAnotherActiveAdministrator(ctx, user);
        const auditOrganizationId = await resolveUserDeletionAuditOrganizationId(ctx, {
            userId: args.userId,
            actorUserId: args.actorUserId,
            wasAlreadyDeleted: user.deletedAt !== undefined,
        });
        await startUserDeletionCascade(ctx, args.userId);
        if (auditOrganizationId) {
            const tombstone = await ctx.db.get('user', args.userId);
            const metadata = sanitizeAuditMetadata('user', {
                before: userAuditSnapshot(user),
                after: tombstone ? userAuditSnapshot(tombstone) : undefined,
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
    v.literal('sessions'),
    v.literal('aggregates'),
    v.literal('finalize')
);
export const cascadeOrganizationDeletionInternal = internalMutation({
    args: {
        organizationId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);
        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }
        await startOrganizationDeletionCascade(ctx, organizationId);
        return null;
    },
});
export const continueOrganizationDeletionCascade = internalMutation({
    args: {
        organizationId: v.id('organization'),
        phase: v.optional(organizationDeletionPhaseValidator),
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
