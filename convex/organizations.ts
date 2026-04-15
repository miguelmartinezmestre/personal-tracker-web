import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { query, type QueryCtx } from './_generated/server';
import { getAuthUserIdentity, getSession } from 'better-convex/auth';
import type { Id } from './_generated/dataModel';
import { ERROR_CODES } from './utils/constants';

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

async function resolveCurrentSession(ctx: QueryCtx) {
    const currentSession = await getSession(ctx);

    if (!currentSession || !currentSession.expiresAt || currentSession.expiresAt < Date.now()) {
        return null;
    }

    return currentSession;
}

export const getCurrentSession = query({
    args: v.object({}),
    handler: async ctx => {
        const currentSession = await resolveCurrentSession(ctx);
        if (!currentSession) return null;

        const user = await ctx.db.get('user', currentSession.userId as Id<'user'>);

        return {
            session: {
                id: currentSession._id,
                userId: currentSession.userId,
                expiresAt: currentSession.expiresAt,
                activeOrganizationId: currentSession.activeOrganizationId,
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

export const getOrganizationsByUser = query({
    args: v.object({}),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return [];

        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .collect();

        const allOrgs = await ctx.db.query('organization').collect();
        const orgMap = new Map(allOrgs.map(o => [o._id, o]));

        const organizations = memberships
            .map(member => {
                const org = orgMap.get(member.organizationId as Id<'organization'>);
                if (!org) return null;

                return {
                    id: org._id,
                    name: org.name,
                    slug: org.slug,
                    description: getOrganizationDescription(org.metadata),
                    logo: org.logo,
                    createdAt: org.createdAt,
                    role: member.role,
                };
            })
            .filter(org => org !== null);

        return organizations;
    },
});

export const getActiveOrganization = query({
    args: v.object({}),
    handler: async ctx => {
        const currentSession = await resolveCurrentSession(ctx);
        if (!currentSession?.activeOrganizationId) return null;

        const org = await ctx.db
            .query('organization')
            .filter(q =>
                q.eq(q.field('_id'), currentSession.activeOrganizationId as Id<'organization'>)
            )
            .first();

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

export const getActiveMember = query({
    args: v.object({}),
    handler: async ctx => {
        const currentSession = await resolveCurrentSession(ctx);
        const activeOrganizationId = currentSession?.activeOrganizationId;
        if (!activeOrganizationId) return null;

        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', activeOrganizationId))
            .filter(q => q.eq(q.field('userId'), currentSession.userId))
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

export const getOrganizationMembers = query({
    args: {
        organizationId: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const userMembership = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .filter(q => q.eq(q.field('userId'), identity.userId))
            .first();

        if (!userMembership) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const paginatedMembers = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .order('desc')
            .paginate(args.paginationOpts);

        const allUsers = await ctx.db.query('user').collect();
        const userMap = new Map(allUsers.map(u => [u._id, u]));

        const enrichedPage = paginatedMembers.page.map(member => {
            const user = userMap.get(member.userId as Id<'user'>);

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

export const getUserInvitations = query({
    args: v.object({}),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return [];

        const user = await ctx.db
            .query('user')
            .filter(q => q.eq(q.field('_id'), identity.userId as Id<'user'>))
            .first();
        if (!user) throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);

        const now = Date.now();
        const invitations = await ctx.db
            .query('invitation')
            .withIndex('email', q => q.eq('email', user.email))
            .filter(q => q.and(q.eq(q.field('status'), 'pending'), q.gt(q.field('expiresAt'), now)))
            .collect();

        const allOrgs = await ctx.db.query('organization').collect();
        const allUsers = await ctx.db.query('user').collect();
        const orgMap = new Map(allOrgs.map(o => [o._id, o]));
        const userMap = new Map(allUsers.map(u => [u._id, u]));

        const invitationsWithDetails = invitations.map(invitation => {
            const org = orgMap.get(invitation.organizationId as Id<'organization'>);
            const inviter = userMap.get(invitation.inviterId as Id<'user'>);

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

export const getOrganizationInvitations = query({
    args: { organizationId: v.string() },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return [];

        const userMembership = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .filter(q => q.eq(q.field('userId'), identity.userId))
            .first();

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const invitations = await ctx.db
            .query('invitation')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .collect();

        const allUsers = await ctx.db.query('user').collect();
        const userMap = new Map(allUsers.map(u => [u._id, u]));

        const invitationsWithDetails = invitations.map(invitation => {
            const inviter = userMap.get(invitation.inviterId as Id<'user'>);

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
