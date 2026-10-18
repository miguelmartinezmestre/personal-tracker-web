import { defaultAc, userAc } from 'better-auth/plugins/admin/access';

export const GLOBAL_ADMIN_ROLE = 'globalAdmin' as const;
export const USER_ROLE = 'user' as const;

export const platformAdminRoles = [GLOBAL_ADMIN_ROLE];
const platformGlobalAdminAc = defaultAc.newRole({ user: [], session: [] });

export const platformRoles = {
    [GLOBAL_ADMIN_ROLE]: platformGlobalAdminAc,
    [USER_ROLE]: userAc,
};

export function isGlobalAdminRole(
    role: string | null | undefined
): role is typeof GLOBAL_ADMIN_ROLE {
    return role === GLOBAL_ADMIN_ROLE;
}
