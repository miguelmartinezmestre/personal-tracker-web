import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { USER_ROLE, isGlobalAdminRole } from './features/auth/roles';
import { revokeBannedUserSessionsBatch } from './features/auth/sessions';
import { requireOtherUser, toAdminUser } from './features/auth/users';
import {
    adminUserValidator,
    platformRoleValidator,
    sessionListItemValidator,
} from './features/auth/validators';
import { insertAuditLog } from './features/audit/log';
import { auditEntryValidator } from './features/audit/validators';

// Every admin function checks the role on the server, besides the route guard (INH-PER-04).
export const listUsers = queryWithRLS({
    args: { search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(adminUserValidator),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const search = args.search?.trim();
        const users = ctx.db.query('user');
        const paginationOpts = withPaginationLimits(args.paginationOpts);
        let result;

        if (!search) {
            result = await users.withIndex('email_name').paginate(paginationOpts);
        } else if (search.includes('@')) {
            result = await users
                .withSearchIndex('search_user_email', q => q.search('email', search))
                .paginate(paginationOpts);
        } else {
            result = await users
                .withSearchIndex('search_user_name', q => q.search('name', search))
                .paginate(paginationOpts);
        }

        // Deleted accounts only remain as a name for shared organizations (decision 4).
        return {
            ...result,
            page: result.page.filter(user => user.deletedAt === undefined).map(toAdminUser),
        };
    },
});

export const setUserRole = mutationWithRLS({
    args: { userId: v.id('user'), role: platformRoleValidator },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await requireOtherUser(ctx, args.userId);
        await ctx.db.patch('user', user._id, { role: args.role, updatedAt: Date.now() });
        await insertAuditLog(ctx, {
            action: 'user.role_changed',
            resourceType: 'user',
            resourceId: user._id,
            userId: user._id,
            severity: 'critical',
            metadata: { before: { role: user.role ?? USER_ROLE }, after: { role: args.role } },
        });

        return null;
    },
});

// Blocks at once, as every request checks the ban; sessions then go in batches of 100.
export const banUser = mutationWithRLS({
    args: {
        userId: v.id('user'),
        reason: v.optional(v.string()),
        // Omitted for a permanent ban.
        durationDays: v.optional(v.number()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await requireOtherUser(ctx, args.userId);
        const now = Date.now();

        if (
            args.durationDays !== undefined &&
            (!Number.isInteger(args.durationDays) || args.durationDays < 1)
        ) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const banUpdatedAt = Math.max(now, user.updatedAt + 1);

        const banExpires =
            args.durationDays === undefined ? null : now + args.durationDays * 24 * 60 * 60 * 1000;

        await ctx.db.patch('user', user._id, {
            banned: true,
            banReason: args.reason?.trim() || null,
            banExpires,
            updatedAt: banUpdatedAt,
        });
        await insertAuditLog(ctx, {
            action: 'user.banned',
            resourceType: 'user',
            resourceId: user._id,
            userId: user._id,
            severity: 'critical',
            metadata: { after: { banExpires } },
        });
        await revokeBannedUserSessionsBatch(ctx, { userId: user._id, banUpdatedAt });

        return null;
    },
});

export const continueBanSessionRevocation = internalMutation({
    args: { userId: v.id('user'), banUpdatedAt: v.number() },
    returns: v.null(),
    handler: async (ctx, args) => {
        await revokeBannedUserSessionsBatch(ctx, args);

        return null;
    },
});

// Revoked sessions don't come back: the user signs in again.
export const unbanUser = mutationWithRLS({
    args: { userId: v.id('user') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await requireOtherUser(ctx, args.userId);

        await ctx.db.patch('user', user._id, {
            banned: false,
            banReason: null,
            banExpires: null,
            updatedAt: Math.max(Date.now(), user.updatedAt + 1),
        });
        await insertAuditLog(ctx, {
            action: 'user.unbanned',
            resourceType: 'user',
            resourceId: user._id,
            userId: user._id,
            severity: 'warning',
        });

        return null;
    },
});

export const listUserSessions = queryWithRLS({
    args: { userId: v.id('user'), paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(sessionListItemValidator),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const result = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'session',
                index: 'userId',
                prefix: [args.userId],
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
                isCurrent: false,
            }))
        );
    },
});

export const revokeUserSession = mutationWithRLS({
    args: { sessionId: v.id('session') },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const session = await ctx.db.get('session', args.sessionId);

        if (!session) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        await ctx.db.delete('session', session._id);

        return null;
    },
});

// Only the global admin reads the log, metadata included (INH-ADM-06).
export const listAuditLogs = queryWithRLS({
    args: {
        resourceType: v.optional(v.string()),
        organizationId: v.optional(v.id('organization')),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginationResultValidator(auditEntryValidator),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

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

        // With both filters the type uses the index and the organization is checked per page.
        const entries = result.page.filter(
            entry => !args.organizationId || entry.organizationId === args.organizationId
        );

        const userNames = new Map<Id<'user'>, string | null>();

        const nameOf = async (userId: Id<'user'> | undefined) => {
            if (!userId) {
                return null;
            }

            if (!userNames.has(userId)) {
                userNames.set(
                    userId,
                    (await ctx.dbForIntegrityChecks.get('user', userId))?.name ?? null
                );
            }

            return userNames.get(userId) ?? null;
        };

        const page = [];

        for (const entry of entries) {
            page.push({
                id: entry._id,
                createdAt: entry.createdAt,
                action: entry.action,
                resourceType: entry.resourceType,
                resourceId: entry.resourceId ?? null,
                severity: entry.severity,
                userName: await nameOf(entry.userId),
                actorName: await nameOf(entry.actorUserId),
                organizationId: entry.organizationId ?? null,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
            });
        }

        return { ...result, page };
    },
});
