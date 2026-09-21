import { defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from './roles';

export const platformAdminRoles = [GLOBAL_ADMIN_ROLE];
const platformGlobalAdminAc = defaultAc.newRole({ user: [], session: [] });

export const platformRoles = {
    [GLOBAL_ADMIN_ROLE]: platformGlobalAdminAc,
    [USER_ROLE]: userAc,
};
