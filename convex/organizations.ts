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
import { isActiveAccount } from './features/auth/users';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from './_generated/server';
import { queryWithRLS } from './features/authorization/wrappers';
import { getMembership, getOrganization, getUser } from './features/auth/authRecords';

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
        const currentSession = await getSession(ctx);

        if (!currentSession || currentSession.expiresAt <= Date.now()) {
            return null;
        }

        const user = await getUser(ctx, currentSession.userId);

        if (!isActiveAccount(user, Date.now())) {
            return null;
        }

        let activeOrganizationId = null;

        const organization = user
            ? await getOrganization(ctx, currentSession.activeOrganizationId)
            : null;

        if (user && organization && (await getMembership(ctx, organization._id, user._id))) {
            activeOrganizationId = organization._id;
        }

        let userSummary = null;

        if (user) {
            userSummary = {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                emailVerified: user.emailVerified,
            };
        } else {
            userSummary = null;
        }

        return {
            session: {
                id: currentSession._id,
                userId: currentSession.userId,
                expiresAt: currentSession.expiresAt,
                activeOrganizationId,
                createdAt: currentSession.createdAt,
            },
            user: userSummary,
        };
    },
});

export const getPersonalOrganizationId = queryWithRLS({
    args: {},
    returns: v.union(v.id('organization'), v.null()),
    handler: async ctx => {
        const integrity = { db: ctx.dbForIntegrityChecks };

        return (await findPersonalOrganization(integrity, ctx.userId))?._id ?? null;
    },
});

export const listOrganizations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(organizationSummaryValidator),
    handler: async (ctx, args) => {
        const integrity = { db: ctx.dbForIntegrityChecks };

        return await listOrganizationsForUser(integrity, ctx.userId, args.paginationOpts);
    },
});

export const getOrganizationByIdentifier = queryWithRLS({
    args: { identifier: v.string() },
    returns: v.union(organizationSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        const integrity = { db: ctx.dbForIntegrityChecks };

        return await findOrganizationByIdentifier(integrity, args.identifier, ctx.userId);
    },
});

export const getUserInvitations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(userInvitationValidator),
    handler: async (ctx, args) => {
        const integrity = { db: ctx.dbForIntegrityChecks };

        return await listInvitationsForUser(integrity, ctx.userId, args.paginationOpts);
    },
});

export const getOrganizationMembers = queryWithRLS({
    args: {
        organizationId: v.id('organization'),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedOrganizationMembersValidator,
    handler: async (ctx, args) => {
        return await listOrganizationMembers(
            { db: ctx.dbForIntegrityChecks },
            {
                organizationId: args.organizationId,
                requesterId: ctx.userId,
                paginationOpts: args.paginationOpts,
            }
        );
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
        return await listPendingInvitationsForOrganization(
            { db: ctx.dbForIntegrityChecks },
            {
                organizationId: args.organizationId,
                requesterId: ctx.userId,
                paginationOpts: args.paginationOpts,
            }
        );
    },
});
