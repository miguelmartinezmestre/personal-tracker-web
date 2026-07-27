export {
    ORGANIZATION_ROLE,
    ORGANIZATION_ROLES,
    isOrganizationAdminRole,
    isOrganizationOwnerRole,
    type OrganizationRole as OrganizationMemberRole,
} from '@shared/organization-roles';

export const OrganizationRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRoleValue = (typeof OrganizationRole)[keyof typeof OrganizationRole];
