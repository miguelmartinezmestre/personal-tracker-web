import { paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { query } from './_generated/server';
import { getSession } from 'kitcn/auth';
import { ERROR_CODES } from './constants';
import { resolveActiveMembership } from './rls/authContext';
import { isPersonalOrganizationForUser } from './personalOrganization';
import { queryWithRLS } from './rls/wrappers';
import {
    isActiveAccount,
    ORGANIZATION_ROLE,
    paginateVisible,
    withInvalidCursorRetry,
    type OrganizationRole,
} from './utils';
import { z } from 'zod';

const organizationRoleValidator = v.union(
    v.literal(ORGANIZATION_ROLE.OWNER),
    v.literal(ORGANIZATION_ROLE.ADMIN),
    v.literal(ORGANIZATION_ROLE.MEMBER)
);

const organizationSummaryValidator = v.object({
    id: v.id('organization'),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    role: organizationRoleValidator,
    isPersonal: v.boolean(),
});

const activeMemberValidator = v.object({
    id: v.id('member'),
    organizationId: v.id('organization'),
    userId: v.id('user'),
    role: organizationRoleValidator,
    createdAt: v.number(),
});

const organizationMemberValidator = v.object({
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

const paginatedOrganizationMembersValidator = paginationResultValidator(
    organizationMemberValidator
);

const userInvitationValidator = v.object({
    id: v.id('invitation'),
    email: v.string(),
    role: v.string(),
    organizationId: v.id('organization'),
    organization: v.optional(v.object({ name: v.string() })),
    inviter: v.optional(v.object({ name: v.string() })),
});

const currentSessionValidator = v.object({
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

const MIN_REFERENCE_TIMESTAMP = Date.UTC(2020, 0, 1);
const MAX_REFERENCE_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;
const organizationMetadataSchema = z.looseObject({ description: z.string().optional() });

function normalizeOrganizationRole(role: string): OrganizationRole {
    if (role === ORGANIZATION_ROLE.OWNER || role === ORGANIZATION_ROLE.ADMIN) {
        return role;
    }
    return ORGANIZATION_ROLE.MEMBER;
}

function parseOrganizationDescription(metadata: string): string | undefined {
    try {
        const parsed: unknown = JSON.parse(metadata);
        const result = organizationMetadataSchema.safeParse(parsed);
        return result.success ? result.data.description : undefined;
    } catch {
        return undefined;
    }
}

function getOrganizationDescription(metadata: string | null | undefined): string {
    if (!metadata) {
        return '';
    }

    return parseOrganizationDescription(metadata) ?? '';
}

function assertValidReferenceTimestamp(now: number): void {
    if (
        !Number.isFinite(now) ||
        now < MIN_REFERENCE_TIMESTAMP ||
        Math.abs(now - Date.now()) > MAX_REFERENCE_CLOCK_SKEW_MS
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
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
        let isValid = false;
        if (invitation) {
            isValid = invitation.status === 'pending' && invitation.expiresAt > serverNow;
        }
        return { isValid };
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
                if (normalized) {
                    return await ctx.dbForIntegrityChecks.get('invitation', normalized);
                }
                return null;
            },
            accepts: async invitation =>
                invitation.email === ctx.email &&
                invitation.status === 'pending' &&
                invitation.expiresAt > now &&
                Boolean(
                    await ctx.dbForIntegrityChecks.get('organization', invitation.organizationId)
                ),
        });
        const page = await Promise.all(
            result.page.map(async invitation => {
                const [organization, inviter] = await Promise.all([
                    ctx.dbForIntegrityChecks.get('organization', invitation.organizationId),
                    ctx.dbForIntegrityChecks.get('user', invitation.inviterId),
                ]);
                return {
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role || 'member',
                    organizationId: invitation.organizationId,
                    organization: organization ? { name: organization.name } : undefined,
                    inviter: inviter ? { name: inviter.name } : undefined,
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

        return {
            ...paginatedMembers,
            page: enrichedPage,
        };
    },
});
