export const GLOBAL_ADMIN_ROLE = 'globalAdmin' as const;
export const USER_ROLE = 'user' as const;

export function isGlobalAdminRole(
    role: string | null | undefined
): role is typeof GLOBAL_ADMIN_ROLE {
    return role === GLOBAL_ADMIN_ROLE;
}
