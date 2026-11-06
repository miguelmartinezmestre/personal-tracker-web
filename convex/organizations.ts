import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
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
import { getSession } from 'kitcn/auth';
import { isActiveAccount } from './features/auth/users';
import { isOrganizationAdminRole } from './features/organizations/roles';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from './_generated/server';
import { queryWithRLS } from './features/authorization/wrappers';
import { getMembership, getOrganization, getUser } from './features/auth/authRecords';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';

export const getPublicInvitationStatus = query({
    args: {
        invitationId: v.string(),
    },
    returns: v.object({
        isValid: v.boolean(),
        organizationName: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const serverNow = Date.now();
        const invitationId = ctx.db.normalizeId('invitation', args.invitationId);

        if (!invitationId) {
            return { isValid: false };
        }

        const invitation = await ctx.db.get('invitation', invitationId);

        if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= serverNow) {
            return { isValid: false };
        }

        const organization = await ctx.db.get('organization', invitation.organizationId);

        if (!organization) {
            return { isValid: false };
        }

        return {
            isValid: true,
            organizationName: organization.name,
        };
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
        const user = await ctx.dbForIntegrityChecks.get('user', ctx.userId);

        if (!user?.emailVerified) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const email = user.email;

        const result = await ctx.dbForIntegrityChecks
            .query('invitation')
            // Date.now() stays out of the index range: a moving bound invalidates the cursor.
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', email).eq('status', 'pending')
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const now = Date.now();

        const isListed = (invitation: Doc<'invitation'>) => invitation.expiresAt > now;

        const live = result.page.filter(isListed);

        const page = await Promise.all(
            live.map(async invitation => {
                const [organization, inviter] = await Promise.all([
                    ctx.dbForIntegrityChecks.get('organization', invitation.organizationId),
                    ctx.dbForIntegrityChecks.get('user', invitation.inviterId),
                ]);

                if (!organization) {
                    return null;
                }

                return {
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role || 'member',
                    organizationId: invitation.organizationId,
                    organization: { name: organization.name },
                    inviter: inviter ? { name: inviter.name } : undefined,
                };
            })
        );

        return await withNextPageCheck(
            ctx.dbForIntegrityChecks,
            {
                table: 'invitation',
                index: 'by_email_status_expiresAt',
                prefix: [email, 'pending'],
                indexKey: doc => [doc.email, doc.status, doc.expiresAt],
                paginationOpts: args.paginationOpts,
                isLive: isListed,
            },
            {
                ...result,
                isDone:
                    result.isDone || result.page.some(invitation => invitation.expiresAt <= now),
            },
            page.filter(invitation => invitation !== null)
        );
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
        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!membership || !isOrganizationAdminRole(membership.role)) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const result = await ctx.db
            .query('invitation')
            // Date.now() stays out of the index range: a moving bound invalidates the cursor.
            .withIndex('by_organizationId_status_expiresAt', q =>
                q.eq('organizationId', args.organizationId).eq('status', 'pending')
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const now = Date.now();
        const live = result.page.filter(invitation => invitation.expiresAt > now);

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'invitation',
                index: 'by_organizationId_status_expiresAt',
                prefix: [args.organizationId, 'pending'],
                indexKey: doc => [doc.organizationId, doc.status, doc.expiresAt],
                paginationOpts: args.paginationOpts,
                isLive: doc => doc.expiresAt > now,
            },
            { ...result, isDone: result.isDone || live.length < result.page.length },
            live.map(invitation => ({
                id: invitation._id,
                email: invitation.email,
                role: invitation.role || 'member',
                expiresAt: invitation.expiresAt,
            }))
        );
    },
});
