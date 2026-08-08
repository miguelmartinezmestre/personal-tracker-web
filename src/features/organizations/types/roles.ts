export {
    ORGANIZATION_ROLES,
    isOrganizationAdminRole,
    isOrganizationOwnerRole,
} from '@shared/organization-roles';

export const OrganizationRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRoleValue = (typeof OrganizationRole)[keyof typeof OrganizationRole];
