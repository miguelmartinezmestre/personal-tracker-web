import { mutation, query, QueryCtx } from "./_generated/server";
import { getAuthenticatedUser } from "./auth";
import {
    customCtx,
    customMutation,
    customQuery,
} from "convex-helpers/server/customFunctions";
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import { DataModel } from "./_generated/dataModel";

async function rlsRules(ctx: QueryCtx) {
    const user = await getAuthenticatedUser(ctx);
    const userId = user ? (user.userId || String(user._id)) : null;

    // Helper para verificar si un usuario es admin global
    const isGlobalAdmin = async () => {
        if (!userId) return false;
        try {
            // Try to find user by userId field first, then by _id
            let userRecord = await ctx.db
                .query("user")
                .withIndex("userId", (q) => q.eq("userId", userId))
                .first();

            // If not found, try to find by _id
            if (!userRecord && userId) {
                try {
                    const potentialRecord = await ctx.db.get(userId as any);
                    // Only use if it's actually a user record
                    if (potentialRecord && "email" in potentialRecord && "name" in potentialRecord) {
                        userRecord = potentialRecord as any;
                    }
                } catch {
                    // Ignore if _id is not a valid ID
                }
            }

            if (!userRecord) return false;
            const userRole = (userRecord as any)?.role;
            return userRole === "admin" || userRole === "ADMIN";
        } catch {
            return false;
        }
    };

    // Helper para verificar si un usuario es miembro de una organización
    const isOrganizationMember = async (organizationId: string) => {
        if (!userId) return false;
        const member = await ctx.db
            .query("member")
            .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
            .filter((q) => q.eq(q.field("userId"), userId))
            .first();
        return !!member;
    };

    // Helper para verificar si un usuario es owner o admin de una organización (team manager)
    const isOrganizationAdmin = async (organizationId: string) => {
        if (!userId) return false;
        // Los admins globales pueden gestionar cualquier organización
        if (await isGlobalAdmin()) return true;

        const member = await ctx.db
            .query("member")
            .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.or(
                        q.eq(q.field("role"), "owner"),
                        q.eq(q.field("role"), "admin")
                    )
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
                    .query("member")
                    .withIndex("organizationId", (q) => q.eq("organizationId", member.organizationId))
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
                return String(userRecord._id) === userId || userRecord.userId === userId || String(userRecord._id) === String(userId);
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
    } satisfies Rules<QueryCtx, DataModel>;
}

// Por defecto, las tablas sin regla tienen `defaultPolicy` configurado como "deny"
const config: RLSConfig = { defaultPolicy: "deny" };

export const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx) => {
        // Store original database for auth lookups (bypasses RLS)
        const originalDb = ctx.db;

        // Capture identity during setup (works in test environments)
        // This must be done BEFORE calling rlsRules, so that getAuthenticatedUser
        // can use the captured identity when called from within rlsRules
        // In test environments, ctx.auth.getUserIdentity() might return null
        // even when t.withIdentity() is called, so we try multiple approaches
        let capturedIdentity = null;
        try {
            capturedIdentity = await ctx.auth.getUserIdentity();
        } catch {
            // Identity might not be available yet
        }
        
        // Fallback for test environments: try to access identity directly
        // convex-test might store it in a different location
        if (!capturedIdentity) {
            const authObj = (ctx as any).auth;
            if (authObj) {
                // Try to access identity from various possible locations
                capturedIdentity = 
                    authObj._identity ||
                    authObj.identity ||
                    (authObj as any)._testIdentity ||
                    (ctx as any)._testIdentity ||
                    (ctx as any).identity;
            }
        }

        // Create a context with captured identity for rlsRules to use
        const ctxWithIdentity = {
            ...ctx,
            _originalDb: originalDb,
            _capturedIdentity: capturedIdentity,
        };

        // Build the wrapped context, preserving all original context properties
        const wrappedCtx = {
            ...ctx, // Spread all original context properties (including auth, scheduler, etc.)
            db: wrapDatabaseReader(ctx, ctx.db, await rlsRules(ctxWithIdentity), config),
            // Expose original database for authentication lookups (bypasses RLS)
            _originalDb: originalDb,
            // Store captured identity for use in handlers
            _capturedIdentity: capturedIdentity,
        };

        return wrappedCtx;
    }),
);

export const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx) => {
        // Store original database for auth lookups (bypasses RLS)
        const originalDb = ctx.db;

        // Capture identity during setup (works in test environments)
        // This must be done BEFORE calling rlsRules, so that getAuthenticatedUser
        // can use the captured identity when called from within rlsRules
        // In test environments, ctx.auth.getUserIdentity() might return null
        // even when t.withIdentity() is called, so we try multiple approaches
        let capturedIdentity = null;
        try {
            capturedIdentity = await ctx.auth.getUserIdentity();
        } catch {
            // Identity might not be available yet
        }
        
        // Fallback for test environments: try to access identity directly
        // convex-test might store it in a different location
        if (!capturedIdentity) {
            const authObj = (ctx as any).auth;
            if (authObj) {
                // Try to access identity from various possible locations
                capturedIdentity = 
                    authObj._identity ||
                    authObj.identity ||
                    (authObj as any)._testIdentity ||
                    (ctx as any)._testIdentity ||
                    (ctx as any).identity;
            }
        }

        // Create a context with captured identity for rlsRules to use
        const ctxWithIdentity = {
            ...ctx,
            _originalDb: originalDb,
            _capturedIdentity: capturedIdentity,
        };

        // Build the wrapped context, preserving all original context properties
        const wrappedCtx = {
            ...ctx, // Spread all original context properties (including auth, scheduler, etc.)
            db: wrapDatabaseWriter(ctx, ctx.db, await rlsRules(ctxWithIdentity), config),
            // Expose original database for authentication lookups (bypasses RLS)
            _originalDb: originalDb,
            // Store captured identity for use in handlers
            _capturedIdentity: capturedIdentity,
        };

        return wrappedCtx;
    }),
);