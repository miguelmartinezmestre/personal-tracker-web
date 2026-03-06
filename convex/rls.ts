import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel } from './_generated/dataModel';
import type { Id } from './_generated/dataModel';
import { ConvexError } from 'convex/values';

import type { DataModelFromSchemaDefinition } from 'convex/server';
import schema from './schema';
import { getAuth } from './auth';
import { getAuthUserIdentity, getHeaders } from 'better-convex/auth';

export type BetterAuthDataModel = DataModelFromSchemaDefinition<typeof schema>;

async function rlsRules(
    userId: Id<'user'>,
    role: string,
    ctx: QueryCtx,
    organizationId?: Id<'organization'> | null
) {
    const isAdmin = role === 'admin';
    const canAccessObjective = (objective: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        scope?: string;
    }) => {
        if (isAdmin) return true;
        if (objective.scope === 'organization') {
            return (
                Boolean(organizationId) &&
                Boolean(objective.organizationId) &&
                objective.organizationId === organizationId
            );
        }

        return objective.userId === userId;
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
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            insert: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            modify: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
        },
        notifications: {
            read: async (_, notification) => {
                if (isAdmin) return true;
                if (notification.userId === userId) return true;
                if (
                    organizationId &&
                    notification.organizationId &&
                    notification.organizationId === organizationId
                )
                    return true;
                return false;
            },
            insert: async (_, notification) => {
                if (isAdmin) return true;
                if (notification.userId === userId) return true;
                if (
                    organizationId &&
                    notification.organizationId &&
                    notification.organizationId === organizationId
                )
                    return true;
                return false;
            },
            modify: async (_, notification) => {
                if (isAdmin) return true;
                if (notification.userId === userId) return true;
                if (
                    organizationId &&
                    notification.organizationId &&
                    notification.organizationId === organizationId
                )
                    return true;
                return false;
            },
        },
        auditLogs: {
            read: async () => {
                return isAdmin;
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
                return true;
            },
            modify: async () => {
                return isAdmin;
            },
        },
        obtainedAchievements: {
            read: async (_, achievement) => {
                if (isAdmin) return true;

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
                if (isAdmin) return true;
                if (
                    organizationId &&
                    achievement.organization &&
                    achievement.organization === organizationId
                )
                    return true;
                return false;
            },
            insert: async () => {
                return false;
            },
            modify: async () => {
                return false;
            },
        },
        user: {
            read: async (_, user) => {
                if (isAdmin) return true;
                return user._id === userId;
            },
            insert: async () => false,
            modify: async () => isAdmin,
        },
        session: {
            read: async (_, session) => {
                if (isAdmin) return true;
                return session.userId === userId;
            },
            insert: async () => false,
            modify: async () => isAdmin,
        },
        categories: {
            read: async (_, category) => {
                if (isAdmin) return true;
                if (category.userId === userId) return true;
                if (
                    organizationId &&
                    category.organizationId &&
                    category.organizationId === organizationId
                )
                    return true;
                return false;
            },
            insert: async (_, category) => {
                if (category.userId === userId) return true;
                if (
                    organizationId &&
                    category.organizationId &&
                    category.organizationId === organizationId
                )
                    return true;
                return false;
            },
            modify: async (_, category) => {
                if (category.userId === userId) return true;
                if (
                    organizationId &&
                    category.organizationId &&
                    category.organizationId === organizationId
                )
                    return true;
                return false;
            },
        },
        platformSettings: {
            read: async () => isAdmin,
            insert: async () => false,
            modify: async () => false,
        },
    } satisfies Rules<QueryCtx, DataModel>;
}

const config: RLSConfig = { defaultPolicy: 'deny' };

type QueryRlsCtx = {
    db: GenericDatabaseReader<DataModel>;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
};

type MutationRlsCtx = {
    db: GenericDatabaseWriter<DataModel>;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
};

type AuthContext = {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
};

/**
 * Extract the activeOrganizationId from a Better Auth session object.
 */
function extractOrganizationId(session: unknown): Id<'organization'> | null {
    const raw =
        (session as { session?: { activeOrganizationId?: string | null } } | null)?.session
            ?.activeOrganizationId ?? null;
    return raw as Id<'organization'> | null;
}

/**
 * Shared auth + organization resolution logic used by both queryWithRLS and mutationWithRLS.
 * Accepts both QueryCtx and MutationCtx since it only reads from the database.
 */
async function resolveAuthContext(ctx: QueryCtx | MutationCtx): Promise<AuthContext> {
    const identity = await getAuthUserIdentity(ctx);
    if (!identity) {
        throw new ConvexError('Unauthenticated');
    }

    const currentUser = await ctx.db
        .query('user')
        .filter(q => q.eq(q.field('_id'), identity.userId))
        .first();
    if (!currentUser) {
        throw new ConvexError('Unauthenticated');
    }

    let organizationId: Id<'organization'> | null = null;
    try {
        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);
        const session = await auth.api.getSession({ headers });
        organizationId = extractOrganizationId(session);
    } catch {
        organizationId = null;
    }

    if (!organizationId) {
        const membership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', currentUser._id))
            .first();
        organizationId = (membership?.organizationId as Id<'organization'> | null) ?? null;
    }

    return {
        userId: currentUser._id,
        organizationId,
        role: currentUser.role ?? 'user',
    };
}

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx): Promise<QueryRlsCtx> => {
        const { userId, organizationId, role } = await resolveAuthContext(ctx);

        return {
            db: wrapDatabaseReader(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            userId,
            organizationId,
            role,
        };
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx): Promise<MutationRlsCtx> => {
        const { userId, organizationId, role } = await resolveAuthContext(ctx);

        return {
            db: wrapDatabaseWriter(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            userId,
            organizationId,
            role,
        };
    })
);
