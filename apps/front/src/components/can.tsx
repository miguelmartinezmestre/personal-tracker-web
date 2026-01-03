'use client';

import { type ReactNode } from 'react';
import {
    usePermissions,
    useTeamPermissions,
    type Resource,
    type Action,
    type Permission,
} from '@/hooks/use-permissions';

interface CanProps {
    /**
     * La accion a verificar (create, read, update, delete)
     */
    action: Action;
    /**
     * El recurso sobre el que se verifica el permiso
     */
    resource: Resource;
    /**
     * ID del equipo para permisos de equipo (teams, members, teamAchievements)
     */
    teamId?: string;
    /**
     * Contenido a renderizar si tiene permiso
     */
    children: ReactNode;
    /**
     * Contenido alternativo si no tiene permiso
     */
    fallback?: ReactNode;
}

/**
 * Componente para renderizado condicional basado en permisos
 *
 * @example
 * ```tsx
 * <Can action="delete" resource="objectives">
 *   <Button variant="destructive">Eliminar</Button>
 * </Can>
 *
 * <Can action="update" resource="teams" teamId={teamId} fallback={<span>Sin permiso</span>}>
 *   <Button>Editar equipo</Button>
 * </Can>
 * ```
 */
export function Can({ action, resource, teamId, children, fallback = null }: CanProps) {
    const { can } = usePermissions();

    if (!can(action, resource, teamId)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface CanTeamProps extends Omit<CanProps, 'teamId'> {
    /**
     * ID del equipo (requerido)
     */
    teamId: string;
}

/**
 * Componente especializado para permisos de equipo
 * Carga automaticamente el rol del usuario en el equipo
 *
 * @example
 * ```tsx
 * <CanTeam action="delete" resource="members" teamId={teamId}>
 *   <Button variant="destructive">Eliminar miembro</Button>
 * </CanTeam>
 * ```
 */
export function CanTeam({ action, resource, teamId, children, fallback = null }: CanTeamProps) {
    const { can, isLoading } = useTeamPermissions(teamId);

    // Mientras carga, no mostrar nada (o el fallback si se prefiere)
    if (isLoading) {
        return <>{fallback}</>;
    }

    if (!can(action, resource, teamId)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface CanAnyProps {
    /**
     * Lista de permisos a verificar (formato "recurso:accion")
     */
    permissions: Permission[];
    /**
     * ID del equipo para permisos de equipo
     */
    teamId?: string;
    /**
     * Contenido a renderizar si tiene al menos uno de los permisos
     */
    children: ReactNode;
    /**
     * Contenido alternativo si no tiene ningun permiso
     */
    fallback?: ReactNode;
}

/**
 * Componente para verificar si tiene al menos uno de varios permisos
 *
 * @example
 * ```tsx
 * <CanAny permissions={['objectives:create', 'objectives:update']}>
 *   <Button>Gestionar objetivos</Button>
 * </CanAny>
 * ```
 */
export function CanAny({ permissions, teamId, children, fallback = null }: CanAnyProps) {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(permissions, teamId)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface CanAllProps {
    /**
     * Lista de permisos a verificar (formato "recurso:accion")
     */
    permissions: Permission[];
    /**
     * ID del equipo para permisos de equipo
     */
    teamId?: string;
    /**
     * Contenido a renderizar si tiene todos los permisos
     */
    children: ReactNode;
    /**
     * Contenido alternativo si no tiene todos los permisos
     */
    fallback?: ReactNode;
}

/**
 * Componente para verificar si tiene todos los permisos especificados
 *
 * @example
 * ```tsx
 * <CanAll permissions={['teams:update', 'members:create']}>
 *   <Button>Configurar equipo</Button>
 * </CanAll>
 * ```
 */
export function CanAll({ permissions, teamId, children, fallback = null }: CanAllProps) {
    const { hasAllPermissions } = usePermissions();

    if (!hasAllPermissions(permissions, teamId)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

// Re-exportar tipos para conveniencia
export type { Resource, Action, Permission };
