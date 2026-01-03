export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
}

export enum TeamRole {
    MANAGER = 'MANAGER',
    MEMBER = 'MEMBER',
}

// Re-exportar tipos y constantes de permisos del backend
export {
    RESOURCES,
    ACTIONS,
    ROLE_PERMISSIONS,
    TEAM_ROLE_PERMISSIONS,
    hasPermissionInList,
    matchesPermission,
    type Resource,
    type Action,
    type Permission,
} from '@repo/backend/convex/permissions';
