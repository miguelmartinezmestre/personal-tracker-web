import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

const LIST_LIMIT = 1000;
import { query, type QueryCtx } from './_generated/server';
import { getAuthUserIdentity, getSession } from 'kitcn/auth';
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

function normalizeUserId(ctx: QueryCtx, userId: string): Id<'user'> | null {
    return ctx.db.normalizeId('user', userId);
}

function normalizeOrganizationId(ctx: QueryCtx, organizationId: string): Id<'organization'> | null {
    return ctx.db.normalizeId('organization', organizationId);
}

export const getCurrentSession = query({
    args: v.object({}),
    handler: async ctx => {
        const currentSession = await resolveCurrentSession(ctx);
        if (!currentSession) return null;

        const userId = normalizeUserId(ctx, currentSession.userId);
        const user = userId ? await ctx.db.get('user', userId) : null;

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
        const userId = normalizeUserId(ctx, identity.userId);
        if (!userId) return [];

        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        if (memberships.length === 0) return [];

        const orgIds = [...new Set(memberships.map(m => m.organizationId))];
        const orgs = await Promise.all(orgIds.map(id => ctx.db.get('organization', id)));
        const orgMap = new Map(
            orgs.filter((o): o is NonNullable<typeof o> => o !== null).map(o => [o._id, o])
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
        const organizationId = normalizeOrganizationId(ctx, currentSession.activeOrganizationId);
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

export const getActiveMember = query({
    args: v.object({}),
    handler: async ctx => {
        const currentSession = await resolveCurrentSession(ctx);
        const activeOrganizationId = currentSession?.activeOrganizationId;
        if (!activeOrganizationId) return null;
        const organizationId = normalizeOrganizationId(ctx, activeOrganizationId);
        const userId = normalizeUserId(ctx, currentSession.userId);
        if (!organizationId || !userId) return null;

        const member = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', userId)
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

export const getOrganizationMembers = query({
    args: {
        organizationId: v.id('organization'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }
        const userId = normalizeUserId(ctx, identity.userId);
        if (!userId) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const userMembership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', userId)
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

        const userIds = [...new Set(paginatedMembers.page.map(m => m.userId))];
        const users = await Promise.all(userIds.map(id => ctx.db.get('user', id)));
        const userMap = new Map(
            users.filter((u): u is NonNullable<typeof u> => u !== null).map(u => [u._id, u])
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

export const getUserInvitations = query({
    args: v.object({}),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return [];
        const userId = normalizeUserId(ctx, identity.userId);
        if (!userId) return [];

        const user = await ctx.db.get('user', userId);
        if (!user) throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);

        const now = Date.now();
        const invitations = await ctx.db
            .query('invitation')
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', user.email).eq('status', 'pending').gt('expiresAt', now)
            )
            .take(LIST_LIMIT);

        if (invitations.length === 0) return [];

        const orgIds = [...new Set(invitations.map(i => i.organizationId))];
        const inviterIds = [...new Set(invitations.map(i => i.inviterId))];

        const [orgs, inviters] = await Promise.all([
            Promise.all(orgIds.map(id => ctx.db.get('organization', id))),
            Promise.all(inviterIds.map(id => ctx.db.get('user', id))),
        ]);

        const orgMap = new Map(
            orgs.filter((o): o is NonNullable<typeof o> => o !== null).map(o => [o._id, o])
        );
        const userMap = new Map(
            inviters.filter((u): u is NonNullable<typeof u> => u !== null).map(u => [u._id, u])
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

export const getOrganizationInvitations = query({
    args: { organizationId: v.id('organization') },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return [];
        const userId = normalizeUserId(ctx, identity.userId);
        if (!userId) return [];

        const userMembership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', userId)
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

        const inviterIds = [...new Set(invitations.map(i => i.inviterId))];
        const inviters = await Promise.all(inviterIds.map(id => ctx.db.get('user', id)));
        const userMap = new Map(
            inviters.filter((u): u is NonNullable<typeof u> => u !== null).map(u => [u._id, u])
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
