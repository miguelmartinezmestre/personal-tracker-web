export { isOrganizationAdminRole, isOrganizationOwnerRole } from '@shared/organization-roles';

export const OrganizationRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRoleValue = (typeof OrganizationRole)[keyof typeof OrganizationRole];

export function isOrganizationRoleValue(role: string): role is OrganizationRoleValue {
    return (
        role === OrganizationRole.OWNER ||
        role === OrganizationRole.ADMIN ||
        role === OrganizationRole.MEMBER
    );
}
