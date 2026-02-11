import { ConvexError, v } from 'convex/values';
import { query } from './_generated/server';
import { getAuthUserIdentity } from 'better-convex/auth';
import type { Id } from './_generated/dataModel';

export const getCurrentSession = query({
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return null;

        const session = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .order('desc')
            .first();

        if (!session || session.expiresAt < Date.now()) return null;

        const user = await ctx.db.get(identity.userId);

        return {
            session: {
                id: session._id,
                userId: session.userId,
                expiresAt: session.expiresAt,
                activeOrganizationId: session.activeOrganizationId,
                createdAt: session.createdAt,
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
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError('Unauthenticated');

        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .collect();

        const organizations = await Promise.all(
            memberships.map(async member => {
                const org = await ctx.db
                    .query('organization')
                    .filter(q => q.eq(q.field('_id'), member.organizationId as Id<'organization'>))
                    .first();

                if (!org) return null;

                return {
                    id: org._id,
                    name: org.name,
                    slug: org.slug,
                    description: org.metadata ? JSON.parse(org.metadata).description : '',
                    logo: org.logo,
                    createdAt: org.createdAt,
                    role: member.role,
                };
            })
        );

        return organizations.filter(org => org !== null);
    },
});

export const getActiveOrganization = query({
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return null;

        const session = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .order('desc')
            .first();

        if (!session?.activeOrganizationId) return null;

        const org = await ctx.db
            .query('organization')
            .filter(q => q.eq(q.field('_id'), session.activeOrganizationId as Id<'organization'>))
            .first();

        if (!org) return null;

        return {
            id: org._id,
            name: org.name,
            slug: org.slug,
            description: org.metadata ? JSON.parse(org.metadata).description : '',
            logo: org.logo,
            createdAt: org.createdAt,
        };
    },
});

export const getActiveMember = query({
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return null;

        const session = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', identity.userId))
            .order('desc')
            .first();

        if (!session?.activeOrganizationId) return null;

        const member = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', session.activeOrganizationId!))
            .filter(q => q.eq(q.field('userId'), identity.userId))
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
    args: { organizationId: v.string() },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError('Unauthenticated');

        const userMembership = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .filter(q => q.eq(q.field('userId'), identity.userId))
            .first();

        if (!userMembership) {
            throw new ConvexError('Not authorized to view members');
        }

        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .collect();

        const membersWithUsers = await Promise.all(
            members.map(async member => {
                const user = await ctx.db
                    .query('user')
                    .filter(q => q.eq(q.field('_id'), member.userId as Id<'user'>))
                    .first();

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
            })
        );

        return { members: membersWithUsers };
    },
});

export const getUserInvitations = query({
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError('Unauthenticated');

        const user = await ctx.db
            .query('user')
            .filter(q => q.eq(q.field('_id'), identity.userId as Id<'user'>))
            .first();
        if (!user) throw new ConvexError('User not found');

        const now = Date.now();
        const invitations = await ctx.db
            .query('invitation')
            .withIndex('email', q => q.eq('email', user.email))
            .filter(q => q.and(q.eq(q.field('status'), 'pending'), q.gt(q.field('expiresAt'), now)))
            .collect();

        const invitationsWithDetails = await Promise.all(
            invitations.map(async invitation => {
                const org = await ctx.db
                    .query('organization')
                    .filter(q =>
                        q.eq(q.field('_id'), invitation.organizationId as Id<'organization'>)
                    )
                    .first();

                const inviter = await ctx.db
                    .query('user')
                    .filter(q => q.eq(q.field('_id'), invitation.inviterId as Id<'user'>))
                    .first();

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
            })
        );

        return invitationsWithDetails;
    },
});

export const getOrganizationInvitations = query({
    args: { organizationId: v.string() },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError('Unauthenticated');

        const userMembership = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .filter(q => q.eq(q.field('userId'), identity.userId))
            .first();

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
            throw new ConvexError('Not authorized to view invitations');
        }

        const invitations = await ctx.db
            .query('invitation')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .collect();

        const invitationsWithDetails = await Promise.all(
            invitations.map(async invitation => {
                const inviter = await ctx.db
                    .query('user')
                    .filter(q => q.eq(q.field('_id'), invitation.inviterId as Id<'user'>))
                    .first();

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
            })
        );

        return invitationsWithDetails;
    },
});
