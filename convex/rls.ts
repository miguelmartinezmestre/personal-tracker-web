import {
    mutation,
    query,
    type MutationCtx,
    type QueryCtx,
    type DatabaseReader,
    type DatabaseWriter,
} from './_generated/server';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import { auditLogTriggers } from './auditLogTriggers';
import type { DataModel } from './_generated/dataModel';
import type { Id } from './_generated/dataModel';
import { ConvexError } from 'convex/values';

import type { DataModelFromSchemaDefinition } from 'convex/server';
import schema from './schema';
import { ERROR_CODES } from './utils/constants';
import { getAuth } from './generated/auth';
import { getAuthUserIdentity, getHeaders } from 'kitcn/auth';

export type BetterAuthDataModel = DataModelFromSchemaDefinition<typeof schema>;

async function rlsRules(
    userId: Id<'user'>,
    role: string,
    memberRole: string | null,
    ctx: QueryCtx,
    organizationId?: Id<'organization'> | null
) {
    const isGlobalAdmin = role === 'admin';
    const isOrgAdmin =
        Boolean(organizationId) && (memberRole === 'admin' || memberRole === 'owner');
    const activeOrgMembershipCache = new Map<string, Promise<boolean>>();
    const normalizeUserId = (targetUserId: Id<'user'> | string) => {
        return ctx.db.normalizeId('user', targetUserId);
    };
    const normalizeOrganizationId = (targetOrganizationId: Id<'organization'> | string | null) => {
        if (targetOrganizationId === null) return null;
        return ctx.db.normalizeId('organization', targetOrganizationId);
    };
    const isActiveOrganization = (targetOrganizationId?: Id<'organization'> | null) => {
        return (
            Boolean(organizationId) &&
            Boolean(targetOrganizationId) &&
            targetOrganizationId === organizationId
        );
    };
    const hasActiveOrgAdminAccess = (targetOrganizationId?: Id<'organization'> | null) => {
        return isOrgAdmin && isActiveOrganization(targetOrganizationId);
    };
    const isActiveOrganizationMember = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = normalizeUserId(targetUserId);
        if (!organizationId || !normalizedUserId) return false;

        let cached = activeOrgMembershipCache.get(normalizedUserId);
        if (!cached) {
            cached = ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', organizationId).eq('userId', normalizedUserId)
                )
                .first()
                .then(member => member !== null);
            activeOrgMembershipCache.set(normalizedUserId, cached);
        }

        return await cached;
    };
    const hasActiveOrgAdminAccessToUser = async (targetUserId: Id<'user'> | string) => {
        return isOrgAdmin && (await isActiveOrganizationMember(targetUserId));
    };
    const canAccessObjective = (objective: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        scope?: string;
    }) => {
        if (isGlobalAdmin) return true;
        if (objective.scope === 'organization') {
            return isActiveOrganization(objective.organizationId);
        }

        if (objective.userId === userId) {
            return isActiveOrganization(objective.organizationId);
        }

        return hasActiveOrgAdminAccess(objective.organizationId);
    };

    return {
        objectives: {
            read: async (_, objective) => {
                return canAccessObjective(objective);
            },
            insert: async (_, objective) => {
                return canAccessObjective(objective);
            },
            modify: async (_, objective) => {
                return canAccessObjective(objective);
            },
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            insert: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            modify: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
        },
        notifications: {
            read: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (hasActiveOrgAdminAccess(notification.organizationId)) return true;

                return notification.userId === userId;
            },
            insert: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (!isActiveOrganization(notification.organizationId)) return false;
                if (notification.userId === userId) return true;
                if (
                    hasActiveOrgAdminAccess(notification.organizationId) &&
                    (await isActiveOrganizationMember(notification.userId))
                ) {
                    return true;
                }
                if (!notification.objective) return false;
                const objective = await ctx.db.get('objectives', notification.objective);
                if (!objective || notification.userId !== objective.userId) return false;
                return canAccessObjective(objective);
            },
            modify: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (hasActiveOrgAdminAccess(notification.organizationId)) return true;

                return notification.userId === userId;
            },
        },
        notificationPreferences: {
            read: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
            insert: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
            modify: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
        },
        auditLogs: {
            read: async () => {
                return isGlobalAdmin;
            },
            insert: async () => {
                return false;
            },
            modify: async () => {
                return false;
            },
        },
        achievementDefinitions: {
            read: async () => {
                return true;
            },
            insert: async () => {
                return isGlobalAdmin;
            },
            modify: async () => {
                return isGlobalAdmin;
            },
        },
        obtainedAchievements: {
            read: async (_, achievement) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(achievement.userId)) return true;

                return achievement.userId === userId;
            },
            insert: async () => {
                return false;
            },
            modify: async () => {
                return false;
            },
        },
        organizationAchievements: {
            read: async (_, achievement) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(achievement.organization);
            },
            insert: async () => {
                return false;
            },
            modify: async () => {
                return false;
            },
        },
        organizationAchievementContributors: {
            read: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (row.userId === userId) return true;
                const orgAchievement = await ctx.db.get(
                    'organizationAchievements',
                    row.organizationAchievementId
                );
                if (!orgAchievement) return false;
                return isActiveOrganization(orgAchievement.organization);
            },
            insert: async () => false,
            modify: async () => false,
        },
        member: {
            read: async (_, member) => {
                if (isGlobalAdmin) return true;
                if (member.userId === userId) return true;
                return isActiveOrganization(member.organizationId);
            },
            insert: async () => false,
            modify: async () => false,
        },
        user: {
            read: async (_, user) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(user._id)) return true;
                return user._id === userId;
            },
            insert: async () => false,
            modify: async () => isGlobalAdmin,
        },
        session: {
            read: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = normalizeUserId(session.userId);
                if (sessionUserId === userId) return true;
                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? normalizeOrganizationId(session.activeOrganizationId)
                        : null;
                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
            insert: async () => false,
            modify: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = normalizeUserId(session.userId);
                if (sessionUserId === userId) return true;

                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? normalizeOrganizationId(session.activeOrganizationId)
                        : null;
                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
        },
        categories: {
            read: async (_, category) => {
                if (isGlobalAdmin) return true;
                if (category.userId === userId && isActiveOrganization(category.organizationId)) {
                    return true;
                }
                return isActiveOrganization(category.organizationId);
            },
            insert: async (_, category) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(category.organizationId);
            },
            modify: async (_, category) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(category.organizationId);
            },
        },
        platformSettings: {
            read: async () => isGlobalAdmin,
            insert: async () => false,
            modify: async () => false,
        },
    } satisfies Rules<QueryCtx, DataModel>;
}

const config: RLSConfig = { defaultPolicy: 'deny' };

type QueryRlsCtx = {
    db: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type MutationRlsCtx = {
    db: DatabaseWriter;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

type AuthContext = {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

interface AuthSession {
    session?: {
        activeOrganizationId?: string | null;
    };
}

function extractOrganizationId(session: unknown): Id<'organization'> | null {
    if (session === null || typeof session !== 'object') {
        return null;
    }

    const authSession = session as AuthSession;
    const raw = authSession.session?.activeOrganizationId ?? null;

    if (typeof raw !== 'string') {
        return null;
    }

    return raw as Id<'organization'>;
}

async function resolveActiveMembership(
    ctx: QueryCtx | MutationCtx,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null
): Promise<{ role: string | null; organizationId: Id<'organization'> | null }> {
    if (!organizationId) {
        const fallback = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .order('desc')
            .first();
        if (!fallback) {
            return { role: null, organizationId: null };
        }
        return {
            role: fallback.role,
            organizationId: fallback.organizationId,
        };
    }

    const membership = await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', organizationId).eq('userId', userId)
        )
        .first();

    if (membership) {
        return { role: membership.role, organizationId };
    }

    // Fallback a la primera membership si la org activa no tiene membership
    const fallback = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .order('desc')
        .first();

    if (!fallback) {
        return { role: null, organizationId: null };
    }

    return {
        role: fallback.role,
        organizationId: fallback.organizationId,
    };
}

async function resolveAuthContext(ctx: QueryCtx | MutationCtx): Promise<AuthContext> {
    const identity = await getAuthUserIdentity(ctx);
    if (!identity) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const currentUser = await ctx.db.get('user', identity.userId);
    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    let activeOrganizationId: Id<'organization'> | null = null;
    try {
        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const session = await auth.api.getSession({ headers });
        activeOrganizationId = extractOrganizationId(session);
    } catch {
        activeOrganizationId = null;
    }

    const { role: memberRole, organizationId } = await resolveActiveMembership(
        ctx,
        currentUser._id,
        activeOrganizationId
    );

    return {
        userId: currentUser._id,
        organizationId,
        role: currentUser.role ?? 'user',
        memberRole,
    };
}

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx): Promise<QueryRlsCtx> => {
        const { userId, organizationId, role, memberRole } = await resolveAuthContext(ctx);

        return {
            db: wrapDatabaseReader(
                ctx,
                ctx.db,
                await rlsRules(userId, role, memberRole, ctx, organizationId),
                config
            ),
            userId,
            organizationId,
            role,
            memberRole,
        };
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx): Promise<MutationRlsCtx> => {
        const { userId, organizationId, role, memberRole } = await resolveAuthContext(ctx);
        const triggerDb = auditLogTriggers.wrapDB({
            db: ctx.db,
            userId,
            organizationId,
            role,
        }).db;

        const rlsDb = wrapDatabaseWriter(
            ctx,
            triggerDb,
            await rlsRules(userId, role, memberRole, ctx, organizationId),
            config
        );

        return {
            db: rlsDb,
            userId,
            organizationId,
            role,
            memberRole,
        };
    })
);
