import { defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from './platform-roles';

export const platformAdminRoles = [GLOBAL_ADMIN_ROLE];

// Account deletion is intentionally absent. Both self-service and administrative
// deletion use the application's soft-delete pipeline, which preserves the user
// tombstone and performs bounded cleanup. Leaving Better Auth's destructive
// `remove-user` permission enabled would provide a second path that physically
// removes the user row and bypasses that pipeline.
const platformGlobalAdminAc = defaultAc.newRole({
    user: [
        'create',
        'list',
        'set-role',
        'ban',
        'impersonate',
        'set-password',
        'set-email',
        'get',
        'update',
    ],
    session: ['list', 'revoke', 'delete'],
});

export const platformRoles = {
    [GLOBAL_ADMIN_ROLE]: platformGlobalAdminAc,
    [USER_ROLE]: userAc,
};
