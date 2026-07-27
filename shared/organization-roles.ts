export const ORGANIZATION_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];

export const ORGANIZATION_ROLES = [
    ORGANIZATION_ROLE.OWNER,
    ORGANIZATION_ROLE.ADMIN,
    ORGANIZATION_ROLE.MEMBER,
] as const;

export function isOrganizationAdminRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER;
}

export function isOrganizationOwnerRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.OWNER;
}
