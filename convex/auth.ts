import { APIError, createAuthMiddleware } from 'better-auth/api';
import { convex, type BetterAuthOptionsWithoutDatabase } from 'kitcn/auth';
import { internal } from './_generated/api';
import {
    internalQuery,
    internalMutation,
    type ActionCtx,
    type MutationCtx,
    type QueryCtx,
} from './_generated/server';
import authConfig from './auth.config';
import { admin, organization } from 'better-auth/plugins';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authAuditTriggers } from './authAuditTriggers';
import { ERROR_CODES } from './utils/constants';
import { defineAuth } from './generated/auth';
import { buildInvitationEmail } from './platform/email/invitationEmail';
import { queryWithRLS } from './platform/rls/wrappers';
import {
    DEFAULT_ORGANIZATION_NAME,
    DEFAULT_ORGANIZATION_SLUG_BASE,
    buildPersonalOrganizationMetadata,
    buildDefaultOrganizationSlug,
    getPersonalOrganizationOwnerUserId,
    isLegacyPersonalOrganizationSlugForUser,
    isPersonalOrganizationForUser,
    isPersonalOrganizationMetadata,
} from './domain/organizations/personalOrganization';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;
type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: never;
};

import { env } from './lib/env';
import { validatePasswordPolicy } from '../shared/password-policy';
import { platformAdminRoles, platformRoles } from '../shared/platform-admin-access';
import {
    getInvitationIdFromCallbackPath,
    isSetupSecretValid,
    ORGANIZATION_SECURITY_OPTIONS,
    SETUP_SECRET_HEADER,
} from '../shared/auth-security';
import { userDocumentValidator } from './utils/documentValidators';
import { accountDeletionPlugin } from './platform/auth/accountDeletionPlugin';

const PERSONAL_ORGANIZATION_MEMBER_CHECK_LIMIT = 1000;
const SESSION_RECOVERY_BATCH_SIZE = 20;
const SESSION_RECOVERY_MEMBERSHIP_SCAN_LIMIT = 20;

type SessionRecoveryPhase = 'actor-null' | 'actor-unset' | 'actor-deleted' | 'affected';

function normalizeRegistrationEmail(email: string) {
    return email.trim().toLowerCase();
}

function usesReservedPersonalOrganizationIdentity(organization: {
    slug?: unknown;
    metadata?: unknown;
}) {
    const reservedSlug =
        typeof organization.slug === 'string' &&
        organization.slug.startsWith(`${DEFAULT_ORGANIZATION_SLUG_BASE}-`);
    const reservedMetadata =
        (typeof organization.metadata === 'string' &&
            isPersonalOrganizationMetadata(organization.metadata)) ||
        (typeof organization.metadata === 'object' &&
            organization.metadata !== null &&
            (organization.metadata as { type?: unknown }).type === 'personal');

    return reservedSlug || reservedMetadata;
}

function throwReservedPersonalOrganizationIdentity() {
    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.PERSONAL_ORG_UPDATE_RESTRICTED,
        message: 'Personal organization slug and metadata are reserved.',
    });
}

export const getEmailRegistrationAuthorization = internalQuery({
    args: {
        email: v.string(),
        invitationId: v.union(v.string(), v.null()),
        now: v.number(),
    },
    returns: v.union(v.literal('bootstrap'), v.literal('allowed'), v.literal('denied')),
    handler: async (ctx, args) => {
        const settings = await ctx.db.query('platformSettings').first();
        if (!settings) {
            return 'bootstrap';
        }

        if (settings.registrationPolicy === 'open') {
            return 'allowed';
        }

        const normalizedEmail = normalizeRegistrationEmail(args.email);
        if (!normalizedEmail || !args.invitationId) {
            return 'denied';
        }

        const invitationId = ctx.db.normalizeId('invitation', args.invitationId);
        if (!invitationId) {
            return 'denied';
        }

        const invitation = await ctx.db.get('invitation', invitationId);
        if (
            !invitation ||
            invitation.status !== 'pending' ||
            invitation.expiresAt <= args.now ||
            normalizeRegistrationEmail(invitation.email) !== normalizedEmail
        ) {
            return 'denied';
        }

        const organization = await ctx.db.get('organization', invitation.organizationId);
        return organization ? 'allowed' : 'denied';
    },
});

export const ensureDefaultOrganizationForUser = internalMutation({
    args: {
        userId: v.id('user'),
    },
    handler: async (ctx, args) => {
        const existingMembership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', args.userId))
            .first();

        if (existingMembership) {
            return existingMembership.organizationId;
        }

        const now = Date.now();
        const slug = await buildAvailablePersonalOrganizationSlug(ctx, args.userId);
        const organizationId = await ctx.db.insert('organization', {
            name: DEFAULT_ORGANIZATION_NAME,
            slug,
            createdAt: now,
            metadata: buildPersonalOrganizationMetadata(args.userId),
            logo: null,
        });

        await ctx.db.insert('member', {
            organizationId,
            userId: args.userId,
            role: 'owner',
            createdAt: now,
        });

        return organizationId;
    },
});

async function buildAvailablePersonalOrganizationSlug(ctx: MutationCtx, userId: Id<'user'>) {
    const baseSlug = buildDefaultOrganizationSlug(userId);
    let candidate = baseSlug;

    for (let attempt = 0; attempt < 5; attempt++) {
        const collision = await ctx.db
            .query('organization')
            .withIndex('slug', q => q.eq('slug', candidate))
            .first();
        if (!collision) {
            return candidate;
        }

        candidate = `${baseSlug}-${Date.now().toString(36)}-${attempt + 1}`;
    }

    throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
}

async function findOrCreateFallbackOrganization(
    ctx: MutationCtx,
    userId: Id<'user'>,
    deletedOrganizationId: Id<'organization'>
): Promise<Id<'organization'> | null> {
    const user = await ctx.db.get('user', userId);
    if (!user || user.deletedAt !== undefined) {
        return null;
    }

    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(SESSION_RECOVERY_MEMBERSHIP_SCAN_LIMIT);
    const candidates: Array<{
        organizationId: Id<'organization'>;
        createdAt: number;
        isPersonal: boolean;
    }> = [];

    for (const membership of memberships) {
        if (membership.organizationId === deletedOrganizationId) continue;

        const organization = await ctx.db.get('organization', membership.organizationId);
        if (!organization) continue;

        candidates.push({
            organizationId: organization._id,
            createdAt: membership.createdAt,
            isPersonal: isPersonalOrganizationForUser({
                metadata: organization.metadata,
                slug: organization.slug,
                userId,
            }),
        });
    }

    candidates.sort(
        (left, right) =>
            Number(right.isPersonal) - Number(left.isPersonal) || left.createdAt - right.createdAt
    );
    if (candidates[0]) {
        return candidates[0].organizationId;
    }

    const now = Date.now();
    const personalSlug = await buildAvailablePersonalOrganizationSlug(ctx, userId);
    const organizationId = await ctx.db.insert('organization', {
        name: DEFAULT_ORGANIZATION_NAME,
        slug: personalSlug,
        createdAt: now,
        metadata: buildPersonalOrganizationMetadata(userId),
        logo: null,
    });

    await ctx.db.insert('member', {
        organizationId,
        userId,
        role: 'owner',
        createdAt: now,
    });

    return organizationId;
}

async function repairSessionsAfterOrganizationDeletion(
    ctx: MutationCtx,
    sessions: Array<{ _id: Id<'session'>; userId: string }>,
    deletedOrganizationId: Id<'organization'>
) {
    const fallbackByUser = new Map<string, Id<'organization'> | null>();

    for (const session of sessions) {
        let fallbackOrganizationId = fallbackByUser.get(session.userId);
        if (fallbackOrganizationId === undefined) {
            const userId = ctx.db.normalizeId('user', session.userId);
            fallbackOrganizationId = userId
                ? await findOrCreateFallbackOrganization(ctx, userId, deletedOrganizationId)
                : null;
            fallbackByUser.set(session.userId, fallbackOrganizationId);
        }

        if (!fallbackOrganizationId) {
            await ctx.db.delete('session', session._id);
            continue;
        }

        await ctx.db.patch('session', session._id, {
            activeOrganizationId: fallbackOrganizationId,
            updatedAt: Date.now(),
        });
    }
}

async function scheduleSessionRecovery(
    ctx: MutationCtx,
    args: {
        organizationId: Id<'organization'>;
        actorUserId: Id<'user'>;
        phase: SessionRecoveryPhase;
    }
) {
    await ctx.scheduler.runAfter(0, internal.auth.recoverSessionsAfterOrganizationDeletion, args);
}

export const recoverSessionsAfterOrganizationDeletion = internalMutation({
    args: {
        organizationId: v.id('organization'),
        actorUserId: v.id('user'),
        phase: v.optional(
            v.union(
                v.literal('actor-null'),
                v.literal('actor-unset'),
                v.literal('actor-deleted'),
                v.literal('affected')
            )
        ),
    },
    handler: async (ctx, args) => {
        const phase = args.phase ?? 'actor-null';
        let sessions: Array<{ _id: Id<'session'>; userId: string }>;

        if (phase === 'affected') {
            sessions = await ctx.db
                .query('session')
                .withIndex('activeOrganizationId', q =>
                    q.eq('activeOrganizationId', args.organizationId)
                )
                .take(SESSION_RECOVERY_BATCH_SIZE);
        } else {
            const activeOrganizationId =
                phase === 'actor-null'
                    ? null
                    : phase === 'actor-unset'
                      ? undefined
                      : args.organizationId;
            sessions = await ctx.db
                .query('session')
                .withIndex('by_userId_and_activeOrganizationId', q =>
                    q
                        .eq('userId', args.actorUserId)
                        .eq('activeOrganizationId', activeOrganizationId)
                )
                .take(SESSION_RECOVERY_BATCH_SIZE);
        }

        await repairSessionsAfterOrganizationDeletion(ctx, sessions, args.organizationId);

        if (sessions.length === SESSION_RECOVERY_BATCH_SIZE) {
            await scheduleSessionRecovery(ctx, {
                organizationId: args.organizationId,
                actorUserId: args.actorUserId,
                phase,
            });
            return { status: 'in_progress' as const, phase };
        }

        const nextPhase: SessionRecoveryPhase | null =
            phase === 'actor-null'
                ? 'actor-unset'
                : phase === 'actor-unset'
                  ? 'actor-deleted'
                  : phase === 'actor-deleted'
                    ? 'affected'
                    : null;
        if (nextPhase) {
            await scheduleSessionRecovery(ctx, {
                organizationId: args.organizationId,
                actorUserId: args.actorUserId,
                phase: nextPhase,
            });
            return { status: 'in_progress' as const, phase: nextPhase };
        }

        return { status: 'completed' as const, phase };
    },
});

export const isDefaultOrganization = internalQuery({
    args: {
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);
        if (!organizationId) {
            return false;
        }

        const organization = await ctx.db.get('organization', organizationId);
        if (!organization) {
            return false;
        }

        const metadataOwnerUserId = getPersonalOrganizationOwnerUserId(organization.metadata);
        if (metadataOwnerUserId) {
            const ownerUserId = ctx.db.normalizeId('user', metadataOwnerUserId);
            if (!ownerUserId) {
                return false;
            }

            const ownerMembership = await ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', organizationId).eq('userId', ownerUserId)
                )
                .first();

            return ownerMembership?.role === 'owner';
        }

        if (!organization.slug.startsWith(`${DEFAULT_ORGANIZATION_SLUG_BASE}-`)) {
            return false;
        }

        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .take(PERSONAL_ORGANIZATION_MEMBER_CHECK_LIMIT);

        return members.some(member =>
            isLegacyPersonalOrganizationSlugForUser(organization.slug, member.userId)
        );
    },
});

async function isProtectedDefaultOrganization(ctx: GenericCtx, organizationId: string) {
    const isDefaultOrganization: boolean = await ctx.runQuery(internal.auth.isDefaultOrganization, {
        organizationId,
    });

    return isDefaultOrganization;
}

export const getCredentialPasswordHashForDeletion = internalQuery({
    args: { userId: v.id('user') },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query('account')
            .withIndex('providerId_userId', q =>
                q.eq('providerId', 'credential').eq('userId', args.userId)
            )
            .unique();
        return typeof account?.password === 'string' ? account.password : null;
    },
});

export default defineAuth((ctx: GenericCtx): AuthOptions => ({
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
        database: {
            // Convex IDs are generated by the database. Letting Better Auth
            // force an opaque plugin ID (notably for invitations) makes the
            // adapter's `_id` disagree with the ID returned by ctx.db.insert.
            generateId: false,
        },
    },
    user: {
        deleteUser: {
            // The core endpoint physically deletes the user record. Keep it
            // disabled and expose `softDeleteUser` from our plugin instead.
            enabled: false,
        },
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }, _request) => {
            await (ctx as MutationCtx).runMutation(internal.email.sendTransactionalEmail, {
                to: user.email,
                subject: 'Reset your password',
                text: `Click the link to reset your password: ${url}`,
            });
        },
        onPasswordReset: async () => {},
        revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            await (ctx as MutationCtx).runMutation(internal.email.sendTransactionalEmail, {
                to: user.email,
                subject: 'Verify your email address',
                text: `Click the link to verify your email address: ${url}`,
            });
        },
    },
    databaseHooks: {
        session: {
            create: {
                before: async session => {
                    const userId = session.userId as Id<'user'>;
                    const activeOrganizationId: Id<'organization'> = await (
                        ctx as RunnableCtx
                    ).runMutation(internal.auth.ensureDefaultOrganizationForUser, {
                        userId,
                    });

                    return {
                        data: {
                            ...session,
                            activeOrganizationId,
                        },
                    };
                },
            },
        },
    },
    hooks: {
        before: createAuthMiddleware(async authRequest => {
            const pathsWithStrongPassword = [
                '/sign-up/email',
                '/reset-password',
                '/change-password',
            ];
            if (!pathsWithStrongPassword.includes(authRequest.path)) {
                return;
            }

            if (authRequest.path === '/sign-up/email') {
                const signUpBody = authRequest.body as
                    { email?: unknown; callbackURL?: unknown } | undefined;
                const email = signUpBody?.email;
                const invitationId =
                    typeof signUpBody?.callbackURL === 'string'
                        ? getInvitationIdFromCallbackPath(signUpBody.callbackURL)
                        : null;
                const authorization =
                    typeof email === 'string'
                        ? await (ctx as RunnableCtx).runQuery(
                              internal.auth.getEmailRegistrationAuthorization,
                              {
                                  email,
                                  invitationId,
                                  now: Date.now(),
                              }
                          )
                        : 'denied';

                if (authorization === 'bootstrap') {
                    const providedSetupSecret =
                        authRequest.headers?.get(SETUP_SECRET_HEADER) ??
                        authRequest.request?.headers.get(SETUP_SECRET_HEADER);

                    if (!isSetupSecretValid(env.SETUP_SECRET, providedSetupSecret)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.SETUP_SECRET_REQUIRED,
                            message: 'The setup secret is missing or invalid.',
                        });
                    }
                } else if (authorization === 'denied') {
                    throw new APIError('FORBIDDEN', {
                        code: ERROR_CODES.REGISTRATION_INVITATION_REQUIRED,
                        message: 'A valid pending invitation is required to register.',
                    });
                }
            }

            const password =
                (authRequest.body as { password?: unknown; newPassword?: unknown } | undefined)
                    ?.password ??
                (authRequest.body as { newPassword?: unknown } | undefined)?.newPassword ??
                undefined;

            const passwordPolicy = validatePasswordPolicy(password);
            if (!passwordPolicy.ok) {
                throw new APIError('BAD_REQUEST', {
                    code: passwordPolicy.code,
                    message: passwordPolicy.message,
                });
            }
        }),
    },
    plugins: [
        convex({
            authConfig,
            jwks: env.JWKS,
        }),
        accountDeletionPlugin(ctx),
        admin({
            adminRoles: platformAdminRoles,
            roles: platformRoles,
        }),
        organization({
            ...ORGANIZATION_SECURITY_OPTIONS,
            invitationExpiresIn: 60 * 60 * 24 * 2,
            defaultRole: 'member',
            organizationHooks: {
                beforeCreateOrganization: async ({ organization: newOrganization }) => {
                    if (usesReservedPersonalOrganizationIdentity(newOrganization)) {
                        throwReservedPersonalOrganizationIdentity();
                    }
                },
                beforeDeleteOrganization: async ({ organization }) => {
                    if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.PERSONAL_ORG_DELETE_FORBIDDEN,
                            message: 'Personal organization cannot be deleted.',
                        });
                    }
                },
                afterDeleteOrganization: async ({ organization, user }) => {
                    await (ctx as RunnableCtx).runMutation(
                        internal.auth.recoverSessionsAfterOrganizationDeletion,
                        {
                            organizationId: organization.id as Id<'organization'>,
                            actorUserId: user.id as Id<'user'>,
                            phase: 'actor-null',
                        }
                    );
                    await (ctx as RunnableCtx).runMutation(
                        internal.admin.cascadeOrganizationDeletionInternal,
                        {
                            organizationId: organization.id as Id<'organization'>,
                        }
                    );
                },
                beforeUpdateOrganization: async ({ organization, member }) => {
                    if (!('slug' in organization) && !('metadata' in organization)) {
                        return;
                    }

                    if (await isProtectedDefaultOrganization(ctx, member.organizationId)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.PERSONAL_ORG_UPDATE_RESTRICTED,
                            message: 'Personal organization slug and metadata cannot be changed.',
                        });
                    }

                    if (usesReservedPersonalOrganizationIdentity(organization)) {
                        throwReservedPersonalOrganizationIdentity();
                    }
                },
                beforeCreateInvitation: async ({ organization }) => {
                    if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.PERSONAL_ORG_INVITE_FORBIDDEN,
                            message: 'Personal organization cannot invite members.',
                        });
                    }
                },
                beforeAcceptInvitation: async ({ organization }) => {
                    if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.PERSONAL_ORG_INVITE_FORBIDDEN,
                            message: 'Personal organization cannot invite members.',
                        });
                    }
                },
                beforeAddMember: async ({ organization }) => {
                    if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                        throw new APIError('FORBIDDEN', {
                            code: ERROR_CODES.PERSONAL_ORG_MEMBER_ADD_FORBIDDEN,
                            message: 'Personal organization cannot add members.',
                        });
                    }
                },
            },
            sendInvitationEmail: async ({ id, email, organization, inviter, role }) => {
                const invitationEmail = buildInvitationEmail({
                    siteUrl: env.SITE_URL,
                    invitationId: id,
                    inviteeEmail: email,
                    organizationName: organization.name,
                    inviterName: inviter.user.name ?? inviter.user.email,
                    role,
                });

                await (ctx as MutationCtx).runMutation(
                    internal.email.sendTransactionalEmail,
                    invitationEmail
                );
            },
        }),
    ],
    triggers: authAuditTriggers as never,
}));

export const getCurrentUser = queryWithRLS({
    args: {},
    returns: v.union(userDocumentValidator, v.null()),
    handler: async ctx => {
        return await ctx.db.get('user', ctx.userId);
    },
});

export const getCurrentOrganization = queryWithRLS({
    args: {},
    returns: v.union(v.id('organization'), v.null()),
    handler: async ctx => {
        return ctx.organizationId;
    },
});

export const getDashboardContext = queryWithRLS({
    args: {},
    returns: v.object({
        user: userDocumentValidator,
        organizationId: v.union(v.id('organization'), v.null()),
    }),
    handler: async ctx => {
        const user = await ctx.db.get('user', ctx.userId);
        if (!user) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        return {
            user,
            organizationId: ctx.organizationId,
        };
    },
});
