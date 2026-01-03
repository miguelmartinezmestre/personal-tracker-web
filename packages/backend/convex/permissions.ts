import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { query, mutation, QueryCtx, MutationCtx } from './_generated/server';
import { queryWithRLS, mutationWithRLS } from './rls';

// ============================================================================
// RECURSOS Y ACCIONES
// ============================================================================

export const RESOURCES = [
    'objectives',
    'progressUpdates',
    'notifications',
    'categories',
    'teams',
    'members',
    'achievements',
    'users',
    'auditLogs',
    'teamAchievements',
] as const;

export const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Resource}:${Action}` | `${Resource}:*` | '*:*';

// ============================================================================
// PERMISOS POR ROL
// ============================================================================

// Permisos GLOBALES por rol (recursos personales del usuario)
export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
    ADMIN: [
        'objectives:*',
        'progressUpdates:*',
        'notifications:*',
        'categories:*',
        'achievements:*',
        'users:*',
        'auditLogs:read',
    ],
    admin: [
        'objectives:*',
        'progressUpdates:*',
        'notifications:*',
        'categories:*',
        'achievements:*',
        'users:*',
        'auditLogs:read',
    ],
    USER: [
        'objectives:*',
        'progressUpdates:*',
        'notifications:read',
        'notifications:update',
        'categories:*',
        'achievements:read',
        'users:read',
        'users:update',
        'auditLogs:read',
    ],
    user: [
        'objectives:*',
        'progressUpdates:*',
        'notifications:read',
        'notifications:update',
        'categories:*',
        'achievements:read',
        'users:read',
        'users:update',
        'auditLogs:read',
    ],
} as const;

// Permisos de EQUIPO por rol (independientes de permisos globales)
export const TEAM_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
    MANAGER: ['teams:*', 'members:*', 'teamAchievements:read'],
    owner: ['teams:*', 'members:*', 'teamAchievements:read'],
    admin: ['teams:*', 'members:*', 'teamAchievements:read'],
    MEMBER: ['teams:read', 'members:read', 'teamAchievements:read'],
    member: ['teams:read', 'members:read', 'teamAchievements:read'],
} as const;

// Recursos que pertenecen al contexto de equipo
const TEAM_RESOURCES: readonly Resource[] = ['teams', 'members', 'teamAchievements'];

// ============================================================================
// HELPERS DE PERMISOS
// ============================================================================

/**
 * Verifica si un permiso específico está en una lista de permisos
 * Soporta wildcards: "objectives:*" incluye "objectives:create"
 */
export function hasPermissionInList(
    permissionList: readonly string[],
    permission: string
): boolean {
    const [resource, action] = permission.split(':');

    for (const perm of permissionList) {
        // Wildcard total
        if (perm === '*:*') return true;

        const [permResource, permAction] = perm.split(':');

        // Coincidencia exacta
        if (permResource === resource && permAction === action) return true;

        // Wildcard de acción: "objectives:*" incluye cualquier acción sobre objectives
        if (permResource === resource && permAction === '*') return true;

        // Wildcard de recurso: "*:read" incluye read en cualquier recurso
        if (permResource === '*' && permAction === action) return true;
    }

    return false;
}

/**
 * Verifica si un permiso patrón coincide con un permiso específico
 */
export function matchesPermission(pattern: string, permission: string): boolean {
    return hasPermissionInList([pattern], permission);
}

/**
 * Verifica si el usuario tiene un permiso específico
 * - Para recursos globales: verifica rol global y permisos adicionales
 * - Para recursos de equipo: verifica rol en el equipo (independiente del rol global)
 */
export async function checkPermission(
    ctx: { db: QueryCtx['db']; auth: QueryCtx['auth'] },
    permission: Permission,
    options?: { teamId?: Id<'organization'> }
): Promise<boolean> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = String(identity.subject);
    const role = String(identity.role ?? 'user');
    const normalizedRole = role.toLowerCase();
    const [resource] = permission.split(':') as [Resource, Action];

    const isTeamResource = TEAM_RESOURCES.includes(resource);

    if (isTeamResource) {
        // Para recursos de equipo, verificar rol en el equipo
        if (!options?.teamId) return false;

        // organizationId se guarda como string en la tabla member
        const teamIdString = String(options.teamId);
        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', teamIdString))
            .filter(q => q.eq(q.field('userId'), userId))
            .first();

        if (!member) return false;

        // Mapear rol de equipo a permisos
        const teamRole = member.role;
        const teamRolePerms = TEAM_ROLE_PERMISSIONS[teamRole] || [];
        if (hasPermissionInList(teamRolePerms, permission)) return true;
    } else {
        // Para recursos globales, verificar rol global
        const rolePerms =
            ROLE_PERMISSIONS[role] ||
            ROLE_PERMISSIONS[normalizedRole] ||
            ROLE_PERMISSIONS['USER'] ||
            ROLE_PERMISSIONS['user'] ||
            [];
        if (hasPermissionInList(rolePerms, permission)) return true;
    }

    // Check permisos adicionales del usuario (para ambos contextos)
    const userPerms = await ctx.db
        .query('userPermissions')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

    const now = Date.now();
    for (const perm of userPerms) {
        // Verificar expiración
        if (perm.expiresAt && perm.expiresAt < now) continue;

        // Para permisos de equipo, verificar scope
        if (isTeamResource) {
            if (perm.scope?.type !== 'team') continue;
            if (perm.scope?.teamId !== options?.teamId) continue;
        } else {
            // Para permisos globales, ignorar permisos con scope de equipo
            if (perm.scope?.type === 'team') continue;
        }

        if (matchesPermission(perm.permission, permission)) return true;
    }

    return false;
}

/**
 * Versión síncrona para usar en el frontend
 * Requiere que los permisos del usuario ya estén cargados
 */
export function checkPermissionSync(
    role: string,
    userPermissions: Array<{
        permission: string;
        expiresAt?: number;
        scope?: { type: 'global' | 'team'; teamId?: string };
    }>,
    permission: Permission,
    options?: { teamId?: string }
): boolean {
    const [resource] = permission.split(':') as [Resource, Action];
    const isTeamResource = TEAM_RESOURCES.includes(resource);

    if (isTeamResource) {
        // Para recursos de equipo, el rol global no aplica
        // Solo verificamos permisos adicionales con scope de equipo
    } else {
        // Para recursos globales, verificar rol global
        const rolePerms =
            ROLE_PERMISSIONS[role] ||
            ROLE_PERMISSIONS[role.toLowerCase()] ||
            ROLE_PERMISSIONS['USER'] ||
            ROLE_PERMISSIONS['user'] ||
            [];
        if (hasPermissionInList(rolePerms, permission)) return true;
    }

    // Check permisos adicionales
    const now = Date.now();
    for (const perm of userPermissions) {
        if (perm.expiresAt && perm.expiresAt < now) continue;

        if (isTeamResource) {
            if (perm.scope?.type !== 'team') continue;
            if (perm.scope?.teamId !== options?.teamId) continue;
        } else {
            if (perm.scope?.type === 'team') continue;
        }

        if (matchesPermission(perm.permission, permission)) return true;
    }

    return false;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Obtiene los permisos adicionales del usuario actual
 */
export const getUserPermissions = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        if (!userId) return [];

        const permissions = await ctx.db
            .query('userPermissions')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        // Filtrar permisos expirados
        const now = Date.now();
        return permissions.filter(p => !p.expiresAt || p.expiresAt > now);
    },
});

/**
 * Verifica si el usuario actual tiene un permiso específico
 */
export const hasPermission = query({
    args: {
        permission: v.string(),
        teamId: v.optional(v.id('organization')),
    },
    handler: async (ctx, args) => {
        return await checkPermission(ctx, args.permission as Permission, {
            teamId: args.teamId,
        });
    },
});

/**
 * Obtiene el rol del usuario en un equipo específico
 */
export const getTeamRole = queryWithRLS({
    args: {
        teamId: v.id('organization'),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity?.subject);
        if (!userId) return null;

        // organizationId se guarda como string en la tabla member
        const teamIdString = String(args.teamId);
        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', teamIdString))
            .filter(q => q.eq(q.field('userId'), userId))
            .first();

        if (!member) return null;

        // Mapear rol de Better Auth a nuestros roles
        if (member.role === 'owner' || member.role === 'admin') {
            return 'MANAGER';
        }
        return 'MEMBER';
    },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Otorga un permiso adicional a un usuario (solo admin global puede hacerlo)
 */
export const grantPermission = mutationWithRLS({
    args: {
        targetUserId: v.string(),
        permission: v.string(),
        expiresAt: v.optional(v.number()),
        scope: v.optional(
            v.object({
                type: v.union(v.literal('global'), v.literal('team')),
                teamId: v.optional(v.id('organization')),
            })
        ),
    },
    handler: async (ctx, args) => {
        const granterId = String(ctx.identity?.subject);
        const granterRole = String(ctx.identity?.role ?? 'user').toLowerCase();

        // Solo admins globales pueden otorgar permisos globales
        // Para permisos de equipo, el MANAGER del equipo puede otorgarlos
        if (args.scope?.type === 'team' && args.scope.teamId) {
            const canGrant = await checkPermission(ctx, 'members:update', {
                teamId: args.scope.teamId,
            });
            if (!canGrant) {
                throw new Error('No tienes permiso para otorgar permisos en este equipo');
            }
        } else {
            // Permiso global - solo admin
            if (granterRole !== 'admin') {
                throw new Error('Solo los administradores pueden otorgar permisos globales');
            }
        }

        // Verificar que no exista ya
        const existing = await ctx.db
            .query('userPermissions')
            .withIndex('by_user_permission', q =>
                q.eq('userId', args.targetUserId).eq('permission', args.permission)
            )
            .first();

        if (existing) {
            // Actualizar si ya existe
            await ctx.db.patch(existing._id, {
                expiresAt: args.expiresAt,
                grantedBy: granterId,
                grantedAt: Date.now(),
            });
            return existing._id;
        }

        // Crear nuevo permiso
        return await ctx.db.insert('userPermissions', {
            userId: args.targetUserId,
            permission: args.permission,
            grantedBy: granterId,
            grantedAt: Date.now(),
            expiresAt: args.expiresAt,
            scope: args.scope,
        });
    },
});

/**
 * Revoca un permiso adicional de un usuario
 */
export const revokePermission = mutationWithRLS({
    args: {
        targetUserId: v.string(),
        permission: v.string(),
        teamId: v.optional(v.id('organization')),
    },
    handler: async (ctx, args) => {
        const revokerRole = String(ctx.identity?.role ?? 'user').toLowerCase();

        // Verificar permisos para revocar
        if (args.teamId) {
            const canRevoke = await checkPermission(ctx, 'members:update', {
                teamId: args.teamId,
            });
            if (!canRevoke) {
                throw new Error('No tienes permiso para revocar permisos en este equipo');
            }
        } else {
            if (revokerRole !== 'admin') {
                throw new Error('Solo los administradores pueden revocar permisos globales');
            }
        }

        // Buscar y eliminar el permiso
        const permissions = await ctx.db
            .query('userPermissions')
            .withIndex('by_user_permission', q =>
                q.eq('userId', args.targetUserId).eq('permission', args.permission)
            )
            .collect();

        for (const perm of permissions) {
            // Si es permiso de equipo, verificar que sea del equipo correcto
            if (args.teamId) {
                if (perm.scope?.type === 'team' && perm.scope.teamId === args.teamId) {
                    await ctx.db.delete(perm._id);
                }
            } else {
                // Permiso global
                if (!perm.scope || perm.scope.type === 'global') {
                    await ctx.db.delete(perm._id);
                }
            }
        }
    },
});

/**
 * Lista todos los permisos de un usuario (solo admin o el propio usuario)
 */
export const listUserPermissions = queryWithRLS({
    args: {
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const currentUserId = String(ctx.identity?.subject);
        const currentRole = String(ctx.identity?.role ?? 'user').toLowerCase();
        const targetUserId = args.userId || currentUserId;

        // Solo admin puede ver permisos de otros usuarios
        if (targetUserId !== currentUserId && currentRole !== 'admin') {
            throw new Error('No tienes permiso para ver los permisos de otros usuarios');
        }

        const permissions = await ctx.db
            .query('userPermissions')
            .withIndex('by_user', q => q.eq('userId', targetUserId))
            .collect();

        return permissions;
    },
});
