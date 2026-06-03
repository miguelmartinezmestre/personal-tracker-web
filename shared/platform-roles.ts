export const GLOBAL_ADMIN_ROLE = 'globalAdmin' as const;
export const USER_ROLE = 'user' as const;

export const PLATFORM_ROLES = [GLOBAL_ADMIN_ROLE, USER_ROLE] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export function isGlobalAdminRole(
    role: string | null | undefined
): role is typeof GLOBAL_ADMIN_ROLE {
    return role === GLOBAL_ADMIN_ROLE;
}
