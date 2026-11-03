export const ORGANIZATION_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];

export function isOrganizationAdminRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER;
}

export function isOrganizationOwnerRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.OWNER;
}

export function isOrganizationRoleValue(role: string): role is OrganizationRole {
    return (
        role === ORGANIZATION_ROLE.OWNER ||
        role === ORGANIZATION_ROLE.ADMIN ||
        role === ORGANIZATION_ROLE.MEMBER
    );
}

export function normalizeOrganizationRole(role: string): OrganizationRole {
    if (role === ORGANIZATION_ROLE.OWNER || role === ORGANIZATION_ROLE.ADMIN) {
        return role;
    }

    return ORGANIZATION_ROLE.MEMBER;
}
