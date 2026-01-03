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

async function rlsRules(userId: string, role: string, ctx: QueryCtx) {
    const normalizedRole = role.toLowerCase();
    // Helper para verificar si un usuario es admin global
    const isGlobalAdmin = async () => {
        if (normalizedRole !== 'admin') return false;
        try {
            // If not found, try to find by _id
            return true;
        } catch {
            return false;
        }
    };

    // Helper para verificar si un usuario es miembro de una organización
    const isOrganizationMember = async (organizationId: string) => {
        if (!userId) return false;
        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .filter(q => q.eq(q.field('userId'), userId))
            .first();
        return !!member;
    };

    // Helper para verificar si un usuario es owner o admin de una organización (team manager)
    const isOrganizationAdmin = async (organizationId: string) => {
        if (!userId) return false;
        // Los admins globales pueden gestionar cualquier organización
        if (await isGlobalAdmin()) return true;

        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .filter(q =>
                q.and(
                    q.eq(q.field('userId'), userId),
                    q.or(q.eq(q.field('role'), 'owner'), q.eq(q.field('role'), 'admin'))
                )
            )
            .first();
        return !!member;
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
                // Los logs de auditoría no deben modificarse (ni siquiera por admins)
                return false;
            },
        },
        organization: {
            read: async (_, org) => {
                if (!userId) return false;
                // Los admins pueden leer todas las organizaciones
                if (isAdmin) return true;
                // Solo miembros de la organización pueden ver la organización
                return await isOrganizationMember(String(org._id));
            },
            insert: async () => {
                if (!userId) return false;
                // Los admins y cualquier usuario autenticado pueden crear una organización
                // (se convertirá en owner después)
                return true;
            },
            modify: async (_, org) => {
                if (!userId) return false;
                // Los admins pueden modificar cualquier organización
                if (isAdmin) return true;
                // Solo owners y admins (team managers) pueden modificar la organización
                return await isOrganizationAdmin(String(org._id));
            },
        },
        member: {
            read: async (_, member) => {
                if (!userId) return false;
                // Los admins pueden leer todos los miembros
                if (isAdmin) return true;
                // Solo miembros de la organización pueden ver otros miembros
                return await isOrganizationMember(member.organizationId);
            },
            insert: async (_, member) => {
                if (!userId) return false;
                // Los admins pueden agregar miembros a cualquier organización
                if (isAdmin) return true;

                // Verificar si la organización tiene miembros
                const existingMembers = await ctx.db
                    .query('member')
                    .withIndex('organizationId', q => q.eq('organizationId', member.organizationId))
                    .collect();

                // Si no hay miembros, permitir que el usuario se agregue a sí mismo
                if (existingMembers.length === 0) {
                    return member.userId === userId;
                }

                // Si hay miembros, solo owners y admins (team managers) pueden agregar nuevos miembros
                return await isOrganizationAdmin(member.organizationId);
            },
            modify: async (_, member) => {
                if (!userId) return false;
                // Los admins pueden modificar cualquier miembro
                if (isAdmin) return true;
                // Solo owners y admins (team managers) pueden modificar miembros de su organización
                return await isOrganizationAdmin(member.organizationId);
            },
        },
        session: {
            read: async (_, session) => {
                if (!userId) return false;
                // Los admins pueden ver todas las sesiones
                if (isAdmin) return true;
                // Los usuarios solo pueden ver sus propias sesiones
                return session.userId === userId;
            },
            insert: async () => {
                // Las sesiones son creadas por el sistema de auth
                return false;
            },
            modify: async (_, session) => {
                if (!userId) return false;
                // Los admins pueden modificar todas las sesiones
                if (isAdmin) return true;
                // Los usuarios solo pueden modificar sus propias sesiones
                return session.userId === userId;
            },
        },
        user: {
            read: async (_, userRecord) => {
                if (!userId) return false;
                // Los admins pueden leer todos los usuarios
                if (isAdmin) return true;
                // Los usuarios solo pueden ver su propio perfil
                return String(userRecord._id) === userId || userRecord.userId === userId;
            },
            insert: async () => {
                // Los usuarios son creados por el sistema de auth
                return false;
            },
            modify: async (_, userRecord) => {
                if (!userId) return false;
                // Los admins pueden modificar cualquier usuario
                if (isAdmin) return true;
                // Los usuarios solo pueden modificar su propio perfil
                return (
                    String(userRecord._id) === userId ||
                    userRecord.userId === userId ||
                    String(userRecord._id) === String(userId)
                );
            },
        },
        account: {
            read: async (_, account) => {
                if (!userId) return false;
                // Los admins pueden leer todas las cuentas
                if (isAdmin) return true;
                // Los usuarios solo pueden ver sus propias cuentas
                return account.userId === userId;
            },
            insert: async () => {
                // Las cuentas son creadas por el sistema de auth
                return false;
            },
            modify: async (_, account) => {
                if (!userId) return false;
                // Los admins pueden modificar todas las cuentas
                if (isAdmin) return true;
                // Los usuarios solo pueden modificar sus propias cuentas
                return account.userId === userId;
            },
        },
        verification: {
            read: async () => {
                // Las verificaciones son solo para el sistema
                return false;
            },
            insert: async () => {
                // Las verificaciones son creadas por el sistema de auth
                return false;
            },
            modify: async () => {
                // Las verificaciones no deben modificarse manualmente
                return false;
            },
        },
        jwks: {
            read: async () => {
                // Los JWKS son solo para el sistema
                return false;
            },
            insert: async () => {
                // Los JWKS son creados por el sistema de auth
                return false;
            },
            modify: async () => {
                // Los JWKS no deben modificarse manualmente
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
                // Solo admins pueden crear definiciones
                return isAdmin;
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
        teamAchievements: {
            read: async (_, achievement) => {
                if (!userId) return false;
                // Los admins pueden leer todos los logros de equipo
                if (isAdmin) return true;
                // Miembros del equipo pueden ver los logros
                return await isOrganizationMember(achievement.team);
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
                // Miembros del equipo pueden ver el progreso del equipo
                if (progress.team) {
                    return await isOrganizationMember(progress.team);
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
                // Los managers de equipo pueden ver permisos de su equipo
                if (permission.scope?.type === 'team' && permission.scope.teamId) {
                    return await isOrganizationAdmin(permission.scope.teamId);
                }
                return false;
            },
            insert: async (_, permission) => {
                if (!userId) return false;
                // Los admins pueden crear cualquier permiso
                if (isAdmin) return true;
                // Los managers de equipo pueden crear permisos de su equipo
                if (permission.scope?.type === 'team' && permission.scope.teamId) {
                    return await isOrganizationAdmin(permission.scope.teamId);
                }
                return false;
            },
            modify: async (_, permission) => {
                if (!userId) return false;
                // Los admins pueden modificar cualquier permiso
                if (isAdmin) return true;
                // Los managers de equipo pueden modificar permisos de su equipo
                if (permission.scope?.type === 'team' && permission.scope.teamId) {
                    return await isOrganizationAdmin(permission.scope.teamId);
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
