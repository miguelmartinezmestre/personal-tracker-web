import { v } from 'convex/values';
import { paginationResultValidator } from 'convex/server';
import { organizationRoleValidator } from './validators';

export const organizationSummaryValidator = v.object({
    id: v.id('organization'),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    role: organizationRoleValidator,
    isPersonal: v.boolean(),
});

export const activeMemberValidator = v.object({
    id: v.id('member'),
    organizationId: v.id('organization'),
    userId: v.id('user'),
    role: organizationRoleValidator,
    createdAt: v.number(),
});

export const organizationMemberValidator = v.object({
    id: v.id('member'),
    organizationId: v.id('organization'),
    userId: v.id('user'),
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
    id: v.id('invitation'),
    email: v.string(),
    role: v.string(),
    organizationId: v.id('organization'),
    organization: v.optional(v.object({ name: v.string() })),
    inviter: v.optional(v.object({ name: v.string() })),
});

export const currentSessionValidator = v.object({
    session: v.object({
        id: v.id('session'),
        userId: v.string(),
        expiresAt: v.number(),
        activeOrganizationId: v.union(v.id('organization'), v.null()),
        createdAt: v.number(),
    }),
    user: v.union(
        v.null(),
        v.object({
            id: v.id('user'),
            name: v.string(),
            email: v.string(),
            image: v.optional(v.union(v.null(), v.string())),
            emailVerified: v.boolean(),
        })
    ),
});

export const successResultValidator = v.object({
    success: v.boolean(),
});
