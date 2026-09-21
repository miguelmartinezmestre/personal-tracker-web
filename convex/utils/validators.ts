import { v } from 'convex/values';
import { ORGANIZATION_ROLE } from '../domain/organizations/roles';

export const organizationRoleValidator = v.union(
    v.literal(ORGANIZATION_ROLE.OWNER),
    v.literal(ORGANIZATION_ROLE.ADMIN),
    v.literal(ORGANIZATION_ROLE.MEMBER)
);
