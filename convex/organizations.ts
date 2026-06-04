import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

const LIST_LIMIT = 1000;
import { query } from './_generated/server';
import { getSession } from 'kitcn/auth';
import { ERROR_CODES } from './utils/constants';
import { resolveActiveMembership } from './platform/rls/authContext';
import { isPersonalOrganizationForUser } from './domain/organizations/personalOrganization';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';

function getOrganizationDescription(metadata: string | null | undefined): string {
    if (!metadata) {
        return '';
    }

    try {
        const parsed = JSON.parse(metadata) as { description?: unknown } | null;
        if (parsed && typeof parsed === 'object' && typeof parsed.description === 'string') {
            return parsed.description;
        }
    } catch {
        return '';
    }

    return '';
}

export const getCurrentSession = query({
    args: {},
    handler: async ctx => {
        const currentSession = await getSession(ctx);
        if (!currentSession) return null;

        const userId = ctx.db.normalizeId('user', currentSession.userId);
        const user = userId ? await ctx.db.get('user', userId) : null;
        const activeOrganizationId =
            userId && currentSession.activeOrganizationId
                ? (
                      await resolveActiveMembership(
                          ctx,
                          userId,
                          ctx.db.normalizeId('organization', currentSession.activeOrganizationId)
                      )
                  ).organizationId
                : null;

        return {
            session: {
                id: currentSession._id,
                userId: currentSession.userId,
                expiresAt: currentSession.expiresAt,
                activeOrganizationId,
                createdAt: currentSession.createdAt,
            },
            user: user
                ? {
                      id: user._id,
                      name: user.name,
                      email: user.email,
                      image: user.image,
                      emailVerified: user.emailVerified,
                  }
                : null,
        };
    },
});

export const getOrganizationsByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', ctx.userId))
            .take(LIST_LIMIT);

        if (memberships.length === 0) return [];

        const orgIds = [...new Set(memberships.map(membership => membership.organizationId))];
        const orgs = await Promise.all(orgIds.map(id => ctx.db.get('organization', id)));
        const orgMap = new Map(
            orgs
                .filter(
                    (organization): organization is NonNullable<typeof organization> =>
                        organization !== null
                )
                .map(organization => [organization._id, organization])
        );

        const organizations = memberships
            .map(member => {
                const org = orgMap.get(member.organizationId);
                if (!org) return null;

                return {
                    id: org._id,
                    name: org.name,
                    slug: org.slug,
                    description: getOrganizationDescription(org.metadata),
                    logo: org.logo,
                    createdAt: org.createdAt,
                    role: member.role,
                    isPersonal: isPersonalOrganizationForUser({
                        metadata: org.metadata,
                        slug: org.slug,
                        userId: member.userId,
                    }),
                };
            })
            .filter(org => org !== null);

        return organizations;
    },
});

export const getActiveOrganization = queryWithRLS({
    args: {},
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) return null;

        const org = await ctx.db.get('organization', organizationId);

        if (!org) return null;

        return {
            id: org._id,
            name: org.name,
            slug: org.slug,
            description: getOrganizationDescription(org.metadata),
            logo: org.logo,
            createdAt: org.createdAt,
        };
    },
});

export const getActiveMember = queryWithRLS({
    args: {},
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) return null;

        const member = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!member) return null;

        return {
            id: member._id,
            organizationId: member.organizationId,
            userId: member.userId,
            role: member.role,
            createdAt: member.createdAt,
        };
    },
});

export const getOrganizationMembers = queryWithRLS({
    args: {
        organizationId: v.id('organization'),
        paginationOpts: paginationOptsValidator,
    },
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
            .paginate(args.paginationOpts);

        const userIds = [...new Set(paginatedMembers.page.map(member => member.userId))];
        const users = await Promise.all(userIds.map(id => ctx.db.get('user', id)));
        const userMap = new Map(
            users
                .filter((user): user is NonNullable<typeof user> => user !== null)
                .map(user => [user._id, user])
        );

        const enrichedPage = paginatedMembers.page.map(member => {
            const user = userMap.get(member.userId);

            return {
                id: member._id,
                organizationId: member.organizationId,
                userId: member.userId,
                role: member.role,
                createdAt: member.createdAt,
                user: user
                    ? {
                          email: user.email,
                          name: user.name,
                          image: user.image,
                      }
                    : null,
            };
        });

        return {
            page: enrichedPage,
            continueCursor: paginatedMembers.continueCursor,
            isDone: paginatedMembers.isDone,
        };
    },
});

export const getUserInvitations = queryWithRLS({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const invitations = await ctx.db
            .query('invitation')
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', ctx.email).eq('status', 'pending').gt('expiresAt', now)
            )
            .take(LIST_LIMIT);

        if (invitations.length === 0) return [];

        const orgIds = [...new Set(invitations.map(invitation => invitation.organizationId))];
        const inviterIds = [...new Set(invitations.map(invitation => invitation.inviterId))];

        const [orgs, inviters] = await Promise.all([
            Promise.all(orgIds.map(id => ctx.db.get('organization', id))),
            Promise.all(inviterIds.map(id => ctx.db.get('user', id))),
        ]);

        const orgMap = new Map(
            orgs
                .filter(
                    (organization): organization is NonNullable<typeof organization> =>
                        organization !== null
                )
                .map(organization => [organization._id, organization])
        );
        const userMap = new Map(
            inviters
                .filter((user): user is NonNullable<typeof user> => user !== null)
                .map(user => [user._id, user])
        );

        const invitationsWithDetails = invitations.map(invitation => {
            const org = orgMap.get(invitation.organizationId);
            const inviter = userMap.get(invitation.inviterId);

            return {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role || 'member',
                organizationId: invitation.organizationId,
                status: invitation.status,
                createdAt: invitation.createdAt,
                expiresAt: invitation.expiresAt,
                organization: org
                    ? {
                          id: org._id,
                          name: org.name,
                          slug: org.slug,
                      }
                    : undefined,
                inviter: inviter
                    ? {
                          id: inviter._id,
                          name: inviter.name,
                          email: inviter.email,
                      }
                    : undefined,
            };
        });

        return invitationsWithDetails;
    },
});

export const getOrganizationInvitations = queryWithRLS({
    args: { organizationId: v.id('organization') },
    handler: async (ctx, args) => {
        const userMembership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const invitations = await ctx.db
            .query('invitation')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .take(LIST_LIMIT);

        if (invitations.length === 0) return [];

        const inviterIds = [...new Set(invitations.map(invitation => invitation.inviterId))];
        const inviters = await Promise.all(inviterIds.map(id => ctx.db.get('user', id)));
        const userMap = new Map(
            inviters
                .filter((user): user is NonNullable<typeof user> => user !== null)
                .map(user => [user._id, user])
        );

        const invitationsWithDetails = invitations.map(invitation => {
            const inviter = userMap.get(invitation.inviterId);

            return {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role || 'member',
                organizationId: invitation.organizationId,
                status: invitation.status,
                createdAt: invitation.createdAt,
                expiresAt: invitation.expiresAt,
                inviter: inviter
                    ? {
                          id: inviter._id,
                          name: inviter.name,
                          email: inviter.email,
                      }
                    : undefined,
            };
        });

        return invitationsWithDetails;
    },
});

export const expireInvitation = mutationWithRLS({
    args: {
        organizationId: v.id('organization'),
        invitationId: v.id('invitation'),
    },
    handler: async (ctx, args) => {
        const userMembership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const invitation = await ctx.db.get('invitation', args.invitationId);
        if (!invitation || invitation.organizationId !== args.organizationId) {
            throw new ConvexError(ERROR_CODES.INVITATION_NOT_FOUND);
        }

        await ctx.db.patch(args.invitationId, {
            expiresAt: 0,
            status: 'cancelled',
        });
    },
});
