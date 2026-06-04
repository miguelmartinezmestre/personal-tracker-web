import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from './platform-roles';

export const platformAdminRoles = [GLOBAL_ADMIN_ROLE];

export const platformRoles = {
    [GLOBAL_ADMIN_ROLE]: adminAc,
    [USER_ROLE]: userAc,
};
