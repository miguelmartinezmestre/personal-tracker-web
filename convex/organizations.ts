import { paginateVisible } from './utils/visiblePagination';
import { paginationResultValidator } from 'convex/server';
import { isActiveAccount } from './domain/organizations/operational';
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

const LIST_LIMIT = 1000;
import { query } from './_generated/server';
import { getSession } from 'kitcn/auth';
import { ERROR_CODES } from './utils/constants';
import { resolveActiveMembership } from './platform/rls/authContext';
import { isPersonalOrganizationForUser } from './domain/organizations/personalOrganization';
import { queryWithRLS } from './platform/rls/wrappers';
import {
    activeMemberValidator,
    currentSessionValidator,
    organizationInvitationValidator,
    organizationSummaryValidator,
    paginatedOrganizationMembersValidator,
    userInvitationValidator,
} from './utils/apiReturnValidators';
import { assertValidReferenceTimestamp, isInvitationActive } from './utils/queryTime';
import { ORGANIZATION_ROLE, type OrganizationRole } from '../shared/organization-roles';
import { withInvalidCursorRetry } from './utils/pagination';
import { getOptionalString, isJsonObject, type JsonObject } from '../shared/boundary-values';

function normalizeOrganizationRole(role: string): OrganizationRole {
    if (role === ORGANIZATION_ROLE.OWNER || role === ORGANIZATION_ROLE.ADMIN) {
        return role;
    }
    return ORGANIZATION_ROLE.MEMBER;
}

function parseOrganizationMetadata(metadata: string): JsonObject | undefined {
    try {
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- JSON.parse is an untyped boundary; immediately narrowed by isJsonObject
        const parsed: JsonObject | object | string | number | boolean | null = JSON.parse(metadata);
        if (isJsonObject(parsed)) {
            return parsed;
        }
    } catch {
        return undefined;
    }
    return undefined;
}

function getOrganizationDescription(metadata: string | null | undefined): string {
    if (!metadata) {
        return '';
    }

    const parsed = parseOrganizationMetadata(metadata);
    return getOptionalString(parsed?.description) ?? '';
}

export const getPublicInvitationStatus = query({
    args: {
        invitationId: v.string(),
        now: v.number(),
    },
    returns: v.object({ isValid: v.boolean() }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const serverNow = Date.now();
        const invitationId = ctx.db.normalizeId('invitation', args.invitationId);
        if (!invitationId) {
            return { isValid: false };
        }

        const invitation = await ctx.db.get('invitation', invitationId);
        return { isValid: invitation ? isInvitationActive(invitation, serverNow) : false };
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
    returns: v.array(organizationSummaryValidator),
    handler: async ctx => {
        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', ctx.userId))
            .take(LIST_LIMIT);

        if (memberships.length === 0) {
            return [];
        }

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
                if (!org) {
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
                        slug: org.slug,
                        userId: member.userId,
                    }),
                };
            })
            .filter(org => org !== null);

        return organizations;
    },
});

export const getOrganizationsPage = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: v.object({
        ...paginationResultValidator(organizationSummaryValidator).fields,
        needsContinuation: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const result = await paginateVisible({
            scope: JSON.stringify(['organizations', ctx.userId]),
            paginationOpts: args.paginationOpts,
            fetchPage: paginationOpts =>
                ctx.dbForIntegrityChecks
                    .query('member')
                    .withIndex('userId', q => q.eq('userId', ctx.userId))
                    .order('desc')
                    .paginate(paginationOpts),
            get: async id => {
                const normalized = ctx.db.normalizeId('member', id);
                return normalized ? await ctx.dbForIntegrityChecks.get('member', normalized) : null;
            },
            accepts: async member =>
                member.userId === ctx.userId &&
                Boolean(await ctx.dbForIntegrityChecks.get('organization', member.organizationId)),
        });
        const page = await Promise.all(
            result.page.map(async member => {
                const org = await ctx.dbForIntegrityChecks.get(
                    'organization',
                    member.organizationId
                );
                if (!org) {
                    throw new ConvexError(ERROR_CODES.ORG_NOT_FOUND);
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
                        slug: org.slug,
                        userId: ctx.userId,
                    }),
                };
            })
        );
        return { ...result, page };
    },
});

export const getOrganizationByIdentifier = queryWithRLS({
    args: { identifier: v.string() },
    returns: v.union(organizationSummaryValidator, v.null()),
    handler: async (ctx, args) => {
        const value = args.identifier.trim();
        const id = ctx.db.normalizeId('organization', value);
        const org = id
            ? await ctx.dbForIntegrityChecks.get('organization', id)
            : await ctx.dbForIntegrityChecks
                  .query('organization')
                  .withIndex('slug', q => q.eq('slug', value))
                  .first();
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
                slug: org.slug,
                userId: ctx.userId,
            }),
        };
    },
});

export const getUserInvitationsPage = queryWithRLS({
    args: { now: v.number(), paginationOpts: paginationOptsValidator },
    returns: v.object({
        ...paginationResultValidator(userInvitationValidator).fields,
        needsContinuation: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const now = Date.now();
        const result = await paginateVisible({
            scope: JSON.stringify(['userInvitations', ctx.userId, ctx.email]),
            paginationOpts: args.paginationOpts,
            fetchPage: paginationOpts =>
                ctx.dbForIntegrityChecks
                    .query('invitation')
                    .withIndex('by_email_status_expiresAt', q =>
                        q.eq('email', ctx.email).eq('status', 'pending')
                    )
                    .order('desc')
                    .paginate(paginationOpts),
            get: async id => {
                const normalized = ctx.db.normalizeId('invitation', id);
                return normalized
                    ? await ctx.dbForIntegrityChecks.get('invitation', normalized)
                    : null;
            },
            accepts: async invitation =>
                invitation.email === ctx.email &&
                isInvitationActive(invitation, now) &&
                Boolean(
                    await ctx.dbForIntegrityChecks.get('organization', invitation.organizationId)
                ),
        });
        const page = await Promise.all(
            result.page.map(async invitation => {
                const [org, inviter] = await Promise.all([
                    ctx.dbForIntegrityChecks.get('organization', invitation.organizationId),
                    ctx.dbForIntegrityChecks.get('user', invitation.inviterId),
                ]);
                return {
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role || 'member',
                    organizationId: invitation.organizationId,
                    status: invitation.status,
                    createdAt: invitation.createdAt,
                    expiresAt: invitation.expiresAt,
                    organization: org ? { id: org._id, name: org.name, slug: org.slug } : undefined,
                    inviter: inviter
                        ? { id: inviter._id, name: inviter.name, email: inviter.email }
                        : undefined,
                };
            })
        );
        return { ...result, page };
    },
});

export const getOrganizationInvitationsPage = queryWithRLS({
    args: { organizationId: v.id('organization'), paginationOpts: paginationOptsValidator },
    returns: v.object({
        ...paginationResultValidator(organizationInvitationValidator).fields,
        needsContinuation: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const actor = await ctx.dbForIntegrityChecks
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', args.organizationId).eq('userId', ctx.userId)
            )
            .first();
        if (!actor || !['admin', 'owner'].includes(actor.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        const result = await paginateVisible({
            scope: JSON.stringify(['organizationInvitations', ctx.userId, args.organizationId]),
            paginationOpts: args.paginationOpts,
            fetchPage: paginationOpts =>
                ctx.dbForIntegrityChecks
                    .query('invitation')
                    .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
                    .order('desc')
                    .paginate(paginationOpts),
            get: async id => {
                const normalized = ctx.db.normalizeId('invitation', id);
                return normalized
                    ? await ctx.dbForIntegrityChecks.get('invitation', normalized)
                    : null;
            },
            accepts: invitation => invitation.organizationId === args.organizationId,
        });
        const page = await Promise.all(
            result.page.map(async invitation => {
                const inviter = await ctx.dbForIntegrityChecks.get('user', invitation.inviterId);
                return {
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role || 'member',
                    organizationId: invitation.organizationId,
                    status: invitation.status,
                    createdAt: invitation.createdAt,
                    expiresAt: invitation.expiresAt,
                    inviter: inviter
                        ? { id: inviter._id, name: inviter.name, email: inviter.email }
                        : undefined,
                };
            })
        );
        return { ...result, page };
    },
});

export const getActiveMember = queryWithRLS({
    args: {},
    returns: v.union(activeMemberValidator, v.null()),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return null;
        }

        const member = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', ctx.userId)
            )
            .first();

        if (!member) {
            return null;
        }

        return {
            id: member._id,
            organizationId: member.organizationId,
            userId: member.userId,
            role: normalizeOrganizationRole(member.role),
            createdAt: member.createdAt,
        };
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

        const paginatedMembers = await withInvalidCursorRetry(args.paginationOpts, paginationOpts =>
            ctx.db
                .query('member')
                .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
                .order('desc')
                .paginate(paginationOpts)
        );

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

            return {
                id: member._id,
                organizationId: member.organizationId,
                userId: member.userId,
                role: normalizeOrganizationRole(member.role),
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
            ...paginatedMembers,
            page: enrichedPage,
        };
    },
});

export const getUserInvitations = queryWithRLS({
    args: {
        now: v.number(),
    },
    returns: v.array(userInvitationValidator),
    handler: async (ctx, args) => {
        // `now` remains part of the API so clients can refresh this reactive
        // query periodically, but it is never trusted to decide authorization
        // or invitation validity.
        assertValidReferenceTimestamp(args.now);
        const serverNow = Date.now();
        const invitations = await ctx.db
            .query('invitation')
            .withIndex('by_email_status_expiresAt', q =>
                q.eq('email', ctx.email).eq('status', 'pending').gt('expiresAt', serverNow)
            )
            .take(LIST_LIMIT);

        const activeInvitations = invitations.filter(invitation =>
            isInvitationActive(invitation, serverNow)
        );

        if (activeInvitations.length === 0) {
            return [];
        }

        const orgIds = [...new Set(activeInvitations.map(invitation => invitation.organizationId))];
        const inviterIds = [...new Set(activeInvitations.map(invitation => invitation.inviterId))];

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

        const invitationsWithDetails = activeInvitations.map(invitation => {
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
    returns: v.array(organizationInvitationValidator),
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

        if (invitations.length === 0) {
            return [];
        }

        const inviterIds = [...new Set(invitations.map(invitation => invitation.inviterId))];
        const inviters = await Promise.all(
            inviterIds.map(id => ctx.dbForIntegrityChecks.get('user', id))
        );
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
