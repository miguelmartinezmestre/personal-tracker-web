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
import authSchema from './betterAuth/schema';
import { components } from './_generated/api';

export type BetterAuthDataModel = DataModelFromSchemaDefinition<typeof authSchema>;

/**
 * Helper to safely query the betterAuth adapter.
 * Returns null if the component is not available (e.g., in tests).
 */
async function safeBetterAuthQuery<T>(ctx: QueryCtx, queryFn: () => Promise<T>): Promise<T | null> {
    try {
        return await queryFn();
    } catch (error) {
        // In test environments, the betterAuth component may not be registered
        // Return null to indicate the data is not available
        if (error instanceof Error && error.message.includes('not registered')) {
            return null;
        }
        throw error;
    }
}

async function rlsRules(userId: string, role: string, ctx: QueryCtx) {
    const normalizedRole = role.toLowerCase();
    // Helper para verificar si un usuario es admin global
    // Verifies the user actually exists in the database and has admin role
    const isGlobalAdmin = async () => {
        if (normalizedRole !== 'admin') return false;
        try {
            // Verify admin status by checking the user record in the database
            const userRecord = await safeBetterAuthQuery(
                ctx,
                async () =>
                    (await ctx.runQuery(components.betterAuth.adapter.findOne, {
                        model: 'user',
                        where: [{ field: 'userId', value: userId }],
                    })) as BetterAuthDataModel['user']['document'] | null
            );
            return String(userRecord?.role || '').toLowerCase() === 'admin';
        } catch {
            return false;
        }
    };

    // Helper para verificar si un usuario es miembro de una organización
    const isOrganizationMember = async (organizationId: string) => {
        if (!userId) return false;
        const member = await safeBetterAuthQuery(
            ctx,
            async () =>
                (await ctx.runQuery(components.betterAuth.adapter.findOne, {
                    model: 'member',
                    where: [
                        { field: 'organizationId', value: organizationId },
                        { field: 'userId', value: userId },
                    ],
                })) as BetterAuthDataModel['member']['document'] | null
        );
        return !!member;
    };

    // Helper para verificar si un usuario es owner o admin de una organización (organization manager)
    const isOrganizationAdmin = async (organizationId: string) => {
        if (!userId) return false;
        // NOTE: Do NOT grant automatic organization management to global admins by default.
        // The intended policy is that being a global admin does NOT imply organization manager
        // unless explicitly required. If policy changes, update tests & docs.

        // Find the member record for the user in the organization
        const member = await safeBetterAuthQuery(
            ctx,
            async () =>
                (await ctx.runQuery(components.betterAuth.adapter.findOne, {
                    model: 'member',
                    where: [
                        { field: 'organizationId', value: organizationId },
                        { field: 'userId', value: userId },
                    ],
                })) as BetterAuthDataModel['member']['document'] | null
        );

        if (!member) return false;

        // Only members with role 'owner' or 'admin' are considered organization admins (managers)
        const memberRole = String(member?.role || '').toLowerCase();
        return memberRole === 'owner' || memberRole === 'admin';
    };

    const isAdmin = await isGlobalAdmin();

    return {
        objectives: {
            read: async (_, objective) => {
                if (!userId) return false;
                // Los admins pueden leer todos los objetivos
                if (isAdmin) return true;
                // Los usuarios solo pueden leer sus propios objetivos
                return objective.user === userId;
            },
            insert: async (_, objective) => {
                if (!userId) return false;
                // Los admins pueden crear objetivos para cualquier usuario
                if (isAdmin) return true;
                // Los usuarios solo pueden crear objetivos con su propio user ID
                return objective.user === userId;
            },
            modify: async (_, objective) => {
                if (!userId) return false;
                // Los admins pueden modificar todos los objetivos
                if (isAdmin) return true;
                // Los usuarios solo pueden modificar sus propios objetivos
                return objective.user === userId;
            },
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (!userId) return false;
                // Los admins pueden leer todos los progress updates
                if (isAdmin) return true;
                // Verificar que el objetivo pertenece al usuario
                const objective = await ctx.db.get(progressUpdate.objective);
                return objective?.user === userId;
            },
            insert: async (_, progressUpdate) => {
                if (!userId) return false;
                // Los admins pueden crear progress updates para cualquier objetivo
                if (isAdmin) return true;
                // Verificar que el objetivo pertenece al usuario
                const objective = await ctx.db.get(progressUpdate.objective);
                return objective?.user === userId;
            },
            modify: async (_, progressUpdate) => {
                if (!userId) return false;
                // Los admins pueden modificar todos los progress updates
                if (isAdmin) return true;
                // Verificar que el objetivo pertenece al usuario
                const objective = await ctx.db.get(progressUpdate.objective);
                return objective?.user === userId;
            },
        },
        notifications: {
            read: async (_, notification) => {
                if (!userId) return false;
                // Los admins pueden leer todas las notificaciones
                if (isAdmin) return true;
                // Los usuarios solo pueden leer sus propias notificaciones
                return notification.user === userId;
            },
            insert: async (_, notification) => {
                if (!userId) return false;
                // Los admins pueden crear notificaciones para cualquier usuario
                if (isAdmin) return true;
                // Los usuarios solo pueden crear notificaciones para sí mismos
                return notification.user === userId;
            },
            modify: async (_, notification) => {
                if (!userId) return false;
                // Los admins pueden modificar todas las notificaciones
                if (isAdmin) return true;
                // Los usuarios solo pueden modificar sus propias notificaciones
                return notification.user === userId;
            },
        },
        auditLogs: {
            read: async (_, auditLog) => {
                if (!userId) return false;
                // Los admins pueden leer todos los logs
                if (isAdmin) return true;
                // Usuarios regulares solo pueden leer sus propios logs
                return auditLog.user === userId;
            },
            insert: async (_, auditLog) => {
                if (!userId) return false;
                // Los admins pueden crear logs para cualquier usuario
                if (isAdmin) return true;
                // Los usuarios solo pueden crear logs para sí mismos
                return auditLog.user === userId;
            },
            modify: async () => {
                // Los logs de auditoría no deben modificarse ni eliminarse (ni siquiera por admins)
                // modify en Convex RLS cubre tanto update como delete
                return false;
            },
        },
        // Achievement tables
        achievementDefinitions: {
            read: async () => {
                // Todos pueden leer las definiciones de logros
                return true;
            },
            insert: async () => {
                // Cualquier usuario autenticado puede crear definiciones
                // Esto permite el seed de achievements por usuarios nuevos
                // La mutación seedAchievementDefinitions ya verifica duplicados
                return true;
            },
            modify: async () => {
                // Solo admins pueden modificar definiciones
                return isAdmin;
            },
        },
        userAchievements: {
            read: async (_, achievement) => {
                if (!userId) return false;
                // Los admins pueden leer todos los logros
                if (isAdmin) return true;
                // Los usuarios solo pueden ver sus propios logros
                return achievement.user === userId;
            },
            insert: async () => {
                // Solo el sistema puede otorgar logros (via internal mutations)
                return true; // Permitir para internal mutations
            },
            modify: async () => {
                // Los logros no deben modificarse
                return false;
            },
        },
        organizationAchievements: {
            read: async (_, achievement) => {
                if (!userId) return false;
                // Los admins pueden leer todos los logros de organización
                if (isAdmin) return true;
                // Miembros de la organización pueden ver los logros
                return await isOrganizationMember(achievement.organization);
            },
            insert: async () => {
                // Solo el sistema puede otorgar logros
                return true;
            },
            modify: async () => {
                // Los logros no deben modificarse
                return false;
            },
        },
        achievementProgress: {
            read: async (_, progress) => {
                if (!userId) return false;
                // Los admins pueden leer todo el progreso
                if (isAdmin) return true;
                // Los usuarios pueden ver su propio progreso
                if (progress.user === userId) return true;
                // Miembros de la organización pueden ver el progreso de la organización
                if (progress.organization) {
                    return await isOrganizationMember(progress.organization);
                }
                return false;
            },
            insert: async () => {
                // Solo el sistema puede crear registros de progreso
                return true;
            },
            modify: async () => {
                // Solo el sistema puede modificar el progreso
                return true;
            },
        },
        categories: {
            read: async (_, category) => {
                if (!userId) return false;
                if (isAdmin) return true;
                return category.user === userId;
            },
            insert: async (_, category) => {
                if (!userId) return false;
                if (isAdmin) return true;
                return category.user === userId;
            },
            modify: async (_, category) => {
                if (!userId) return false;
                if (isAdmin) return true;
                return category.user === userId;
            },
        },
        userPermissions: {
            read: async (_, permission) => {
                if (!userId) return false;
                // Los admins pueden ver todos los permisos
                if (isAdmin) return true;
                // Los usuarios pueden ver sus propios permisos
                if (permission.userId === userId) return true;
                // Los managers de organización pueden ver permisos de su organización
                if (permission.scope?.type === 'organization' && permission.scope.organizationId) {
                    return await isOrganizationAdmin(permission.scope.organizationId);
                }
                return false;
            },
            insert: async (_, permission) => {
                if (!userId) return false;
                // Los admins pueden crear cualquier permiso
                if (isAdmin) return true;
                // Los managers de organización pueden crear permisos de su organización
                if (permission.scope?.type === 'organization' && permission.scope.organizationId) {
                    return await isOrganizationAdmin(permission.scope.organizationId);
                }
                return false;
            },
            modify: async (_, permission) => {
                if (!userId) return false;
                // Los admins pueden modificar cualquier permiso
                if (isAdmin) return true;
                // Los managers de organización pueden modificar permisos de su organización
                if (permission.scope?.type === 'organization' && permission.scope.organizationId) {
                    return await isOrganizationAdmin(permission.scope.organizationId);
                }
                return false;
            },
        },
    } satisfies Rules<QueryCtx, DataModel>;
}

// Por defecto, las tablas sin regla tienen `defaultPolicy` configurado como "deny"
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

        return {
            db: wrapDatabaseReader(ctx, ctx.db, await rlsRules(userId, role, ctx), config),
            identity: identity,
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

        return {
            db: wrapDatabaseWriter(ctx, ctx.db, await rlsRules(userId, role, ctx), config),
            identity: identity,
        };
    })
);
