import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { withPaginationLimits } from './shared/pagination';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { USER_ROLE, isGlobalAdminRole } from './features/auth/roles';
import {
    listSessionsForUser,
    removeSession,
    revokeBannedUserSessionsBatch,
} from './features/auth/sessions';
import {
    banAccount,
    listAdminUsers,
    setPlatformRole,
    unbanAccount,
} from './features/auth/adminUsers';
import { getUserSummaries } from './features/auth/authRecords';
import {
    adminUserValidator,
    platformRoleValidator,
    sessionListItemValidator,
} from './features/auth/validators';
import { insertAuditLog } from './features/audit/log';
import { auditEntryValidator } from './features/audit/validators';

function requireGlobalAdmin(ctx: { role: string }) {
    if (!isGlobalAdminRole(ctx.role)) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
}

export const listUsers = queryWithRLS({
    args: { search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(adminUserValidator),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        return await listAdminUsers(ctx, args);
    },
});

export const setUserRole = mutationWithRLS({
    args: { userId: v.string(), role: platformRoleValidator },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        const user = await setPlatformRole(ctx, {
            userId: args.userId,
            actorUserId: ctx.userId,
            role: args.role,
        });

        await insertAuditLog(ctx, {
            action: 'user.role_changed',
            resourceType: 'user',
            resourceId: user.id,
            userId: user.id,
            severity: 'critical',
            metadata: { before: { role: user.role ?? USER_ROLE }, after: { role: args.role } },
        });

        return null;
    },
});

export const banUser = mutationWithRLS({
    args: {
        userId: v.string(),
        reason: v.optional(v.string()),
        durationDays: v.optional(v.number()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        if (
            args.durationDays !== undefined &&
            (!Number.isInteger(args.durationDays) || args.durationDays < 1)
        ) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const banExpires =
            args.durationDays === undefined
                ? null
                : Date.now() + args.durationDays * 24 * 60 * 60 * 1000;

        const user = await banAccount(ctx, {
            userId: args.userId,
            actorUserId: ctx.userId,
            reason: args.reason?.trim() || null,
            banExpires,
        });

        await insertAuditLog(ctx, {
            action: 'user.banned',
            resourceType: 'user',
            resourceId: user.id,
            userId: user.id,
            severity: 'critical',
            metadata: { after: { banExpires } },
        });
        await revokeBannedUserSessionsBatch(ctx, {
            userId: user.id,
            banUpdatedAt: user.banUpdatedAt,
        });

        return null;
    },
});

export const continueBanSessionRevocation = internalMutation({
    args: { userId: v.string(), banUpdatedAt: v.number() },
    returns: v.null(),
    handler: async (ctx, args) => {
        await revokeBannedUserSessionsBatch(ctx, args);

        return null;
    },
});

export const unbanUser = mutationWithRLS({
    args: { userId: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        const user = await unbanAccount(ctx, {
            userId: args.userId,
            actorUserId: ctx.userId,
        });

        await insertAuditLog(ctx, {
            action: 'user.unbanned',
            resourceType: 'user',
            resourceId: user.id,
            userId: user.id,
            severity: 'warning',
        });

        return null;
    },
});

export const listUserSessions = queryWithRLS({
    args: { userId: v.string(), paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(sessionListItemValidator),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        return await listSessionsForUser(ctx, {
            userId: args.userId,
            currentSessionId: null,
            paginationOpts: args.paginationOpts,
        });
    },
});

export const revokeUserSession = mutationWithRLS({
    args: { sessionId: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        const removed = await removeSession(ctx, args.sessionId);

        if (!removed) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const sessionUserId = ctx.db.normalizeId('user', removed.userId);

        if (sessionUserId) {
            await insertAuditLog(ctx, {
                action: 'session.revoked_by_admin',
                resourceType: 'session',
                resourceId: removed.id,
                userId: sessionUserId,
                severity: 'warning',
            });
        }

        return null;
    },
});

export const listAuditLogs = queryWithRLS({
    args: {
        resourceType: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginationResultValidator(auditEntryValidator),
    handler: async (ctx, args) => {
        requireGlobalAdmin(ctx);

        const logs = ctx.dbForIntegrityChecks.query('auditLogs');
        let query;

        if (args.resourceType) {
            const resourceType = args.resourceType;
            query = logs.withIndex('by_resourceType_createdAt', q =>
                q.eq('resourceType', resourceType)
            );
        } else if (args.organizationId) {
            const organizationId = args.organizationId;
            query = logs.withIndex('by_organization_createdAt', q =>
                q.eq('organizationId', organizationId)
            );
        } else {
            query = logs.withIndex('by_createdAt');
        }

        const result = await query
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const entries = result.page.filter(
            entry => !args.organizationId || entry.organizationId === args.organizationId
        );

        const users = await getUserSummaries(
            ctx,
            entries
                .flatMap(entry => [entry.userId, entry.actorUserId])
                .filter(userId => userId !== undefined)
        );

        const userNames = new Map<string, string>(users.map(user => [user.id, user.name]));

        const nameOf = (userId: string | undefined) =>
            userId ? (userNames.get(userId) ?? null) : null;

        const page = [];

        for (const entry of entries) {
            page.push({
                id: entry._id,
                createdAt: entry.createdAt,
                action: entry.action,
                resourceType: entry.resourceType,
                resourceId: entry.resourceId ?? null,
                severity: entry.severity,
                userName: nameOf(entry.userId),
                actorName: nameOf(entry.actorUserId),
                organizationId: entry.organizationId ?? null,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
            });
        }

        return { ...result, page };
    },
});
