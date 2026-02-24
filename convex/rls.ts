import { mutation, query, type QueryCtx } from './_generated/server';
import type { GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel } from './_generated/dataModel';
import { ConvexError } from 'convex/values';

import type { DataModelFromSchemaDefinition } from 'convex/server';
import schema from './schema';
import { api } from './_generated/api';

export type BetterAuthDataModel = DataModelFromSchemaDefinition<typeof schema>;

async function rlsRules(
    userId: string,
    role: string,
    ctx: QueryCtx,
    organizationId?: string | null
) {
    const isAdmin = role === 'admin';

    return {
        objectives: {
            read: async (_, objective) => {
                if (isAdmin) return true;
                if (objective.userId === userId) return true;
                // Only match by org if both sides have a real (non-empty) orgId
                if (
                    organizationId &&
                    objective.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
            },
            insert: async (_, objective) => {
                if (isAdmin) return true;
                if (objective.userId === userId) return true;
                if (
                    organizationId &&
                    objective.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
            },
            modify: async (_, objective) => {
                if (isAdmin) return true;
                if (objective.userId === userId) return true;
                if (
                    organizationId &&
                    objective.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
            },
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (objective?.userId === userId) return true;
                if (
                    organizationId &&
                    objective?.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
            },
            insert: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (objective?.userId === userId) return true;
                if (
                    organizationId &&
                    objective?.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
            },
            modify: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (objective?.userId === userId) return true;
                if (
                    organizationId &&
                    objective?.organizationId &&
                    objective.organizationId === organizationId
                )
                    return true;
                return false;
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
    } satisfies Rules<QueryCtx, DataModel>;
}

const config: RLSConfig = { defaultPolicy: 'deny' };

type QueryRlsCtx = {
    db: GenericDatabaseReader<DataModel>;
    userId: string;
    organizationId: string;
    role: string;
};

type MutationRlsCtx = {
    db: GenericDatabaseWriter<DataModel>;
    userId: string;
    organizationId: string;
    role: string;
};

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx): Promise<QueryRlsCtx> => {
        const currentUser = await ctx.runQuery(api.auth.getCurrentUser);
        const currentOrganization = await ctx.runQuery(api.auth.getCurrentOrganization);

        if (!currentUser) {
            throw new ConvexError('Unauthenticated');
        }
        const userId = currentUser.userId ?? String(currentUser._id);
        const role = currentUser.role ?? 'user';
        const organizationId = currentOrganization;

        return {
            db: wrapDatabaseReader(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            userId: userId,
            organizationId: organizationId ?? '',
            role: role,
        };
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx): Promise<MutationRlsCtx> => {
        const currentUser = await ctx.runQuery(api.auth.getCurrentUser);
        const currentOrganization = await ctx.runQuery(api.auth.getCurrentOrganization);

        if (!currentUser) {
            throw new ConvexError('Unauthenticated');
        }
        const userId = currentUser.userId ?? String(currentUser._id);
        const role = currentUser.role ?? 'user';
        const organizationId = currentOrganization;

        return {
            db: wrapDatabaseWriter(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            userId: userId,
            organizationId: organizationId ?? '',
            role: role,
        };
    })
);
