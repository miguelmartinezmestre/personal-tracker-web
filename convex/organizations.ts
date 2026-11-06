import { v } from 'convex/values';
import {
    currentSessionValidator,
    organizationSummaryValidator,
    paginatedOrganizationMembersValidator,
    userInvitationValidator,
} from './features/organizations/validators';
import {
    findOrganizationByIdentifier,
    findPersonalOrganization,
    listOrganizationMembers,
    listOrganizationsForUser,
} from './features/organizations/memberships';
import {
    getInvitationPublicStatus,
    listInvitationsForUser,
    listPendingInvitationsForOrganization,
} from './features/organizations/invitations';
import { getSession } from 'kitcn/auth';
import { readCurrentSession } from './features/auth/sessions';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from './_generated/server';
import { queryWithRLS } from './features/authorization/wrappers';

export const getPublicInvitationStatus = query({
    args: {
        invitationId: v.string(),
    },
    returns: v.object({
        isValid: v.boolean(),
        organizationName: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        return await getInvitationPublicStatus(ctx, args.invitationId);
    },
});

export const getCurrentSession = query({
    args: {},
    returns: v.union(currentSessionValidator, v.null()),
    handler: async ctx => {
        const session = await getSession(ctx);

        return session ? await readCurrentSession(ctx, session._id) : null;
    },
});

export const getPersonalOrganizationId = queryWithRLS({
    args: {},
    returns: v.union(v.id('organization'), v.null()),
    handler: async ctx => {
        return (await findPersonalOrganization(ctx, ctx.userId))?._id ?? null;
    },
});

export const listOrganizations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(organizationSummaryValidator),
    handler: async (ctx, args) => {
        return await listOrganizationsForUser(ctx, ctx.userId, args.paginationOpts);
    },
});

export const getOrganizationByIdentifier = queryWithRLS({
    args: { identifier: v.string() },
    returns: v.union(organizationSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        return await findOrganizationByIdentifier(ctx, args.identifier, ctx.userId);
    },
});

export const getUserInvitations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(userInvitationValidator),
    handler: async (ctx, args) => {
        return await listInvitationsForUser(ctx, ctx.userId, args.paginationOpts);
    },
});

export const getOrganizationMembers = queryWithRLS({
    args: {
        organizationId: v.id('organization'),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedOrganizationMembersValidator,
    handler: async (ctx, args) => {
        return await listOrganizationMembers(ctx, {
            organizationId: args.organizationId,
            requesterId: ctx.userId,
            paginationOpts: args.paginationOpts,
        });
    },
});

export const getOrganizationPendingInvitations = queryWithRLS({
    args: { organizationId: v.id('organization'), paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(
        v.object({
            id: v.id('invitation'),
            email: v.string(),
            role: v.string(),
            expiresAt: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        return await listPendingInvitationsForOrganization(ctx, {
            organizationId: args.organizationId,
            requesterId: ctx.userId,
            paginationOpts: args.paginationOpts,
        });
    },
});
