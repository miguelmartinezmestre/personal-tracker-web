import { ORGANIZATION_ROLE } from './roles';
import { paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';

const organizationRoleValidator = v.union(
    v.literal(ORGANIZATION_ROLE.OWNER),
    v.literal(ORGANIZATION_ROLE.ADMIN),
    v.literal(ORGANIZATION_ROLE.MEMBER)
);

export const organizationSummaryValidator = v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    role: organizationRoleValidator,
    isPersonal: v.boolean(),
});

const organizationMemberValidator = v.object({
    id: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    role: organizationRoleValidator,
    createdAt: v.number(),
    user: v.union(
        v.null(),
        v.object({
            email: v.string(),
            name: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
        })
    ),
});

export const paginatedOrganizationMembersValidator = paginationResultValidator(
    organizationMemberValidator
);

export const userInvitationValidator = v.object({
    id: v.string(),
    email: v.string(),
    role: v.string(),
    organizationId: v.string(),
    organization: v.object({ name: v.string() }),
    inviter: v.optional(v.object({ name: v.string() })),
});

export const currentSessionValidator = v.object({
    session: v.object({
        id: v.string(),
        userId: v.string(),
        expiresAt: v.number(),
        activeOrganizationId: v.union(v.string(), v.null()),
        createdAt: v.number(),
    }),
    user: v.union(
        v.null(),
        v.object({
            id: v.string(),
            name: v.string(),
            email: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
            emailVerified: v.boolean(),
        })
    ),
});
