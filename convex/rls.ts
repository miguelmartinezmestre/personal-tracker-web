import { mutation, query, QueryCtx } from './_generated/server';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from 'convex-helpers/server/rowLevelSecurity';
import { DataModel } from './_generated/dataModel';
import { ConvexError } from 'convex/values';

import type { DataModelFromSchemaDefinition } from 'convex/server';
import { authComponent, createAuth } from './functions/auth';
import schema from './schema';

export type BetterAuthDataModel = DataModelFromSchemaDefinition<typeof schema>;

// Extended session type with organization fields
type SessionWithOrg = {
    session: {
        activeOrganizationId?: string | null;
        [key: string]: any;
    };
};

async function rlsRules(
    userId: string,
    role: string,
    ctx: QueryCtx,
    providedOrganizationId?: string | null
) {
    const isAdmin = role.toLowerCase() === 'admin';

    let organizationId: string | undefined;

    if (providedOrganizationId !== undefined && providedOrganizationId !== null) {
        organizationId = providedOrganizationId;
    } else {
        try {
            const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

            const session = await auth.api.getSession({
                headers,
            }) as SessionWithOrg | null;

            organizationId = session?.session.activeOrganizationId ?? undefined;
        } catch (e) {
            // In test environment, auth might not work properly
            organizationId = undefined;
        }
    }

    // const memberRole = await auth.api.getActiveMemberRole({
    //     headers
    // })

    return {
        objectives: {
            read: async (_, objective) => {
                if (isAdmin) return true;

                return objective.userId === userId || objective.organizationId === organizationId;
            },
            insert: async (_, objective) => {
                if (isAdmin) return true;

                return objective.userId === userId || objective.organizationId === organizationId;
            },
            modify: async (_, objective) => {
                if (isAdmin) return true;

                return objective.userId === userId || objective.organizationId === organizationId;
            },
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                return objective?.userId === userId || objective?.organizationId === organizationId;
            },
            insert: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                return objective?.userId === userId || objective?.organizationId === organizationId;
            },
            modify: async (_, progressUpdate) => {
                if (isAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                return objective?.userId === userId || objective?.organizationId === organizationId;
            },
        },
        notifications: {
            read: async (_, notification) => {
                if (isAdmin) return true;

                return (
                    notification.userId === userId || notification.organizationId === organizationId
                );
            },
            insert: async (_, notification) => {
                if (isAdmin) return true;

                return (
                    notification.userId === userId || notification.organizationId === organizationId
                );
            },
            modify: async (_, notification) => {
                if (isAdmin) return true;

                return (
                    notification.userId === userId || notification.organizationId === organizationId
                );
            },
        },
        auditLogs: {
            read: async (_, auditLog) => {
                return isAdmin;
            },
            insert: async (_, auditLog) => {
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

                return achievement.organization === organizationId;
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

                return category.userId === userId || category.organizationId === organizationId;
            },
            insert: async (_, category) => {
                return category.userId === userId || category.organizationId === organizationId;
            },
            modify: async (_, category) => {
                return category.userId === userId || category.organizationId === organizationId;
            },
        },
    } satisfies Rules<QueryCtx, DataModel>;
}

const config: RLSConfig = { defaultPolicy: 'deny' };

export const queryWithRLS = customQuery(
    query,
    customCtx(async ctx => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError('User not authenticated');
        }

        const role = String(identity.role ?? 'user').toLowerCase();
        const userId = String(identity.subject);

        if (!userId || userId === '') {
            throw new ConvexError('User not authenticated');
        }

        let organizationId: string | null = null;

        try {
            const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

            const session = await auth.api.getSession({
                headers,
            }) as SessionWithOrg | null;

            organizationId = session?.session.activeOrganizationId ?? null;
        } catch (e) {
            // In test environment, auth might not work properly
            // Fall back to using userId from identity
            organizationId = null;
        }

        return {
            db: wrapDatabaseReader(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            identity: identity,
            organizationId: organizationId ?? '',
        };
    })
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async ctx => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError('User not authenticated');
        }

        const role = String(identity.role ?? 'user').toLowerCase();
        const userId = String(identity.subject);

        if (!userId || userId === '') {
            throw new ConvexError('User not authenticated');
        }

        let organizationId: string | null = null;

        try {
            const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

            const session = await auth.api.getSession({
                headers,
            }) as SessionWithOrg | null;

            organizationId = session?.session.activeOrganizationId ?? null;
        } catch (e) {
            // In test environment, auth might not work properly
            // Fall back to using userId from identity
            organizationId = null;
        }

        return {
            db: wrapDatabaseWriter(
                ctx,
                ctx.db,
                await rlsRules(userId, role, ctx, organizationId),
                config
            ),
            identity: identity,
            organizationId: organizationId ?? '',
        };
    })
);
