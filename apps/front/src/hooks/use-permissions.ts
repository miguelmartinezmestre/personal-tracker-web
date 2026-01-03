'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { useUserRole } from './use-user-role';
import {
    ROLE_PERMISSIONS,
    hasPermissionInList,
    matchesPermission,
    type Resource,
    type Action,
    type Permission,
} from '@repo/backend/convex/permissions';
import { authClient } from '@/lib/auth-client';

// Recursos que pertenecen al contexto de equipo
const TEAM_RESOURCES: readonly Resource[] = ['teams', 'members', 'teamAchievements'];

interface UserPermission {
    permission: string;
    expiresAt?: number;
    scope?: {
        type: 'global' | 'team';
        teamId?: string;
    };
}

interface UsePermissionsOptions {
    teamId?: string;
    teamRole?: string | null;
}

export function usePermissions(options?: UsePermissionsOptions) {
    const { role, isAdmin, isAuthenticated } = useUserRole();
    const userPermissionsQuery = useQuery({
        ...convexQuery(api.permissions.getUserPermissions, {}),
        enabled: isAuthenticated,
    });
    const userPermissions = (userPermissionsQuery.data ?? []) as UserPermission[];

    // Normalizar rol a string
    const normalizedRole = useMemo(() => {
        if (typeof role === 'string') return role;
        if (Array.isArray(role) && role.length > 0) return role[0];
        return 'USER';
    }, [role]);

    // Mapear rol de equipo a nuestros roles
    const normalizedTeamRole = useMemo(() => {
        if (!options?.teamRole) return null;
        const teamRole = String(options.teamRole).toLowerCase();
        if (teamRole === 'owner' || teamRole === 'admin' || teamRole === 'member') {
            return teamRole as 'owner' | 'admin' | 'member';
        }
        return null;
    }, [options?.teamRole]);

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    const hasPermission = useCallback(
        (permission: Permission, teamId?: string): boolean => {
            const [resource] = permission.split(':') as [Resource, Action];
            const isTeamResource = TEAM_RESOURCES.includes(resource);
            const effectiveTeamId = teamId || options?.teamId;

            if (isTeamResource) {
                // Permitir crear equipos sin teamId cuando el usuario está autenticado
                if (resource === 'teams' && permission === 'teams:create') {
                    return isAuthenticated;
                }

                if (!effectiveTeamId) return false;

                if (!normalizedTeamRole) {
                    return false;
                }

                // Roles y permisos de organización (Better Auth)
                if (resource === 'teams') {
                    if (permission === 'teams:read') return true;
                    if (permission === 'teams:update') {
                        if (
                            authClient.organization.checkRolePermission({
                                role: normalizedTeamRole,
                                permissions: { organization: ['update'] },
                            })
                        ) {
                            return true;
                        }
                    }
                    if (permission === 'teams:delete') {
                        if (
                            authClient.organization.checkRolePermission({
                                role: normalizedTeamRole,
                                permissions: { organization: ['delete'] },
                            })
                        ) {
                            return true;
                        }
                    }
                }

                if (resource === 'members') {
                    if (permission === 'members:read') return true;
                    if (permission === 'members:create') {
                        if (
                            authClient.organization.checkRolePermission({
                                role: normalizedTeamRole,
                                permissions: { member: ['create'] },
                            })
                        ) {
                            return true;
                        }
                    }
                    if (permission === 'members:update') {
                        if (
                            authClient.organization.checkRolePermission({
                                role: normalizedTeamRole,
                                permissions: { member: ['update'] },
                            })
                        ) {
                            return true;
                        }
                    }
                    if (permission === 'members:delete') {
                        if (
                            authClient.organization.checkRolePermission({
                                role: normalizedTeamRole,
                                permissions: { member: ['delete'] },
                            })
                        ) {
                            return true;
                        }
                    }
                }

                if (resource === 'teamAchievements') {
                    if (permission === 'teamAchievements:read') return true;
                }
            } else {
                // Para recursos globales, verificar rol global
                const roleKey = normalizedRole.toLowerCase();
                const rolePerms =
                    ROLE_PERMISSIONS[normalizedRole] ||
                    ROLE_PERMISSIONS[roleKey] ||
                    ROLE_PERMISSIONS['USER'] ||
                    ROLE_PERMISSIONS['user'] ||
                    [];
                if (hasPermissionInList(rolePerms, permission)) return true;
            }

            // Verificar permisos adicionales del usuario
            const now = Date.now();
            for (const perm of userPermissions) {
                // Verificar expiración
                if (perm.expiresAt && perm.expiresAt < now) continue;

                // Para permisos de equipo, verificar scope
                if (isTeamResource) {
                    if (perm.scope?.type !== 'team') continue;
                    if (perm.scope?.teamId !== effectiveTeamId) continue;
                } else {
                    // Para permisos globales, ignorar permisos con scope de equipo
                    if (perm.scope?.type === 'team') continue;
                }

                if (matchesPermission(perm.permission, permission)) return true;
            }

            return false;
        },
        [normalizedRole, normalizedTeamRole, isAuthenticated, userPermissions, options?.teamId]
    );

    /**
     * Atajo para verificar permisos con sintaxis más legible
     * Ejemplo: can('create', 'objectives')
     */
    const can = useCallback(
        (action: Action, resource: Resource, teamId?: string): boolean => {
            return hasPermission(`${resource}:${action}` as Permission, teamId);
        },
        [hasPermission]
    );

    /**
     * Verifica múltiples permisos (AND)
     */
    const hasAllPermissions = useCallback(
        (permissions: Permission[], teamId?: string): boolean => {
            return permissions.every(p => hasPermission(p, teamId));
        },
        [hasPermission]
    );

    /**
     * Verifica si tiene al menos uno de los permisos (OR)
     */
    const hasAnyPermission = useCallback(
        (permissions: Permission[], teamId?: string): boolean => {
            return permissions.some(p => hasPermission(p, teamId));
        },
        [hasPermission]
    );

    return {
        hasPermission,
        can,
        hasAllPermissions,
        hasAnyPermission,
        isAdmin,
        role: normalizedRole,
        teamRole: normalizedTeamRole,
        isLoading: userPermissionsQuery.isLoading,
    };
}

/**
 * Hook para usar permisos en el contexto de un equipo específico
 */
export function useTeamPermissions(teamId: string) {
    const teamRoleQuery = useQuery({
        queryKey: ['organization-role', teamId],
        queryFn: async () => {
            const result = await authClient.organization.getActiveMemberRole({
                query: { organizationId: teamId },
            });
            if (result && typeof result === 'object' && 'data' in result) {
                return result.data?.role ?? null;
            }
            return null;
        },
    });

    const permissions = usePermissions({
        teamId,
        teamRole: teamRoleQuery.data ?? null,
    });

    return {
        ...permissions,
        isLoading: permissions.isLoading || teamRoleQuery.isLoading,
    };
}

// Re-exportar tipos para uso en componentes
export type { Resource, Action, Permission };
