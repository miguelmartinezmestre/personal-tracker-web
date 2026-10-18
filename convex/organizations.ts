import { ConvexError, v } from 'convex/values';
import { ERROR_CODES } from './shared/errorCodes';
import {
    buildDefaultOrganizationSlug,
    isPersonalOrganizationForUser,
} from './features/organizations/personalOrganization';
import {
    currentSessionValidator,
    organizationSummaryValidator,
    paginatedOrganizationMembersValidator,
    userInvitationValidator,
} from './features/organizations/validators';
import {
    getOrganizationDescription,
    toOrganizationSummaries,
} from './features/organizations/summaries';
import { getSession } from 'kitcn/auth';
import { isActiveAccount } from './features/auth/users';
import { isOrganizationAdminRole, normalizeOrganizationRole } from './features/organizations/roles';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from './_generated/server';
import { queryWithRLS } from './features/authorization/wrappers';
import { resolveActiveMembership } from './features/authorization/authContext';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';

export const getPublicInvitationStatus = query({
    args: {
        invitationId: v.string(),
    },
    // The organization name is only shown to whoever holds a valid invitation link.
    returns: v.object({ isValid: v.boolean(), organizationName: v.optional(v.string()) }),
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

        return { isValid: true, organizationName: organization.name };
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

        const userId = ctx.db.normalizeId('user', currentSession.userId);
        const user = userId ? await ctx.db.get('user', userId) : null;

        if (!isActiveAccount(user, Date.now())) {
            return null;
        }

        let activeOrganizationId = null;

        if (userId && currentSession.activeOrganizationId) {
            activeOrganizationId = (
                await resolveActiveMembership(
                    ctx,
                    userId,
                    ctx.db.normalizeId('organization', currentSession.activeOrganizationId)
                )
            ).organizationId;
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

/** The caller's personal organization, which leaving the active organization falls back to. */
export const getPersonalOrganizationId = queryWithRLS({
    args: {},
    returns: v.union(v.id('organization'), v.null()),
    handler: async ctx => {
        // Usually found by its slug; a slug collision at creation gave it a suffixed one instead.
        const bySlug = await ctx.dbForIntegrityChecks
            .query('organization')
            .withIndex('slug', q => q.eq('slug', buildDefaultOrganizationSlug(ctx.userId)))
            .first();

        if (
            bySlug &&
            isPersonalOrganizationForUser({ metadata: bySlug.metadata, userId: ctx.userId })
        ) {
            return bySlug._id;
        }

        for await (const membership of ctx.dbForIntegrityChecks
            .query('member')
            .withIndex('userId', q => q.eq('userId', ctx.userId))) {
            const organization = await ctx.dbForIntegrityChecks.get(
                'organization',
                membership.organizationId
            );

            if (
                organization &&
                isPersonalOrganizationForUser({
                    metadata: organization.metadata,
                    userId: ctx.userId,
                })
            ) {
                return organization._id;
            }
        }

        return null;
    },
});

export const listOrganizations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(organizationSummaryValidator),
    handler: async (ctx, args) => {
        const result = await ctx.dbForIntegrityChecks
            .query('member')
            .withIndex('userId', q => q.eq('userId', ctx.userId))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        return await withNextPageCheck(
            ctx.dbForIntegrityChecks,
            {
                table: 'member',
                index: 'userId',
                prefix: [ctx.userId],
                indexKey: doc => [doc.userId],
                paginationOpts: args.paginationOpts,
            },
            result,
            await toOrganizationSummaries(ctx, result.page)
        );
    },
});

export const getOrganizationByIdentifier = queryWithRLS({
    args: { identifier: v.string() },
    returns: v.union(organizationSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        const value = args.identifier.trim();
        const id = ctx.db.normalizeId('organization', value);
        let org;

        if (id) {
            org = await ctx.dbForIntegrityChecks.get('organization', id);
        } else {
            org = await ctx.dbForIntegrityChecks
                .query('organization')
                .withIndex('slug', q => q.eq('slug', value))
                .first();
        }

        if (!org) {
            return null;
        }

        const member = await ctx.dbForIntegrityChecks
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', org._id).eq('userId', ctx.userId)
            )
            .first();

        if (!member) {
            return null;
        }

        return {
            id: org._id,
            name: org.name,
            slug: org.slug,
            description: getOrganizationDescription(org.metadata),
            logo: org.logo,
            createdAt: org.createdAt,
            role: normalizeOrganizationRole(member.role),
            isPersonal: isPersonalOrganizationForUser({
                metadata: org.metadata,
                userId: ctx.userId,
            }),
        };
    },
});

export const getUserInvitations = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(userInvitationValidator),
    handler: async (ctx, args) => {
        const email = ctx.email;

        if (!email) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const result = await ctx.dbForIntegrityChecks
            .query('invitation')
            // Date.now() stays out of the index range: a moving bound invalidates the cursor.
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', email).eq('status', 'pending')
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const now = Date.now();
        const live = result.page.filter(invitation => invitation.expiresAt > now);

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
                isLive: doc => doc.expiresAt > now,
            },
            // Newest expiry first, so once one has expired every later one has too.
            { ...result, isDone: result.isDone || live.length < result.page.length },
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
        const userMembership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!userMembership) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const paginatedMembers = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const userIds = [...new Set(paginatedMembers.page.map(member => member.userId))];

        const users = await Promise.all(
            userIds.map(id => ctx.dbForIntegrityChecks.get('user', id))
        );

        const userMap = new Map(
            users
                .filter((user): user is NonNullable<typeof user> => user !== null)
                .map(user => [user._id, user])
        );

        const enrichedPage = paginatedMembers.page.map(member => {
            const user = userMap.get(member.userId);
            let userSummary = null;

            if (user) {
                userSummary = { email: user.email, name: user.name, image: user.image };
            } else {
                userSummary = null;
            }

            return {
                id: member._id,
                organizationId: member.organizationId,
                userId: member.userId,
                role: normalizeOrganizationRole(member.role),
                createdAt: member.createdAt,
                user: userSummary,
            };
        });

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'member',
                index: 'organizationId',
                prefix: [args.organizationId],
                indexKey: doc => [doc.organizationId],
                paginationOpts: args.paginationOpts,
            },
            paginatedMembers,
            enrichedPage
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
            // Newest expiry first, so once one has expired every later one has too.
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
