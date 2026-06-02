import { APIError, createAuthMiddleware } from 'better-auth/api';
import { convex, getAuthUserIdentity, type BetterAuthOptionsWithoutDatabase } from 'kitcn/auth';
import { internal } from './_generated/api';
import {
    internalQuery,
    internalMutation,
    query,
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
import {
    resolveActiveMembership,
    resolveSessionActiveOrganizationId,
} from './platform/rls/authContext';
import {
    DEFAULT_ORGANIZATION_NAME,
    DEFAULT_ORGANIZATION_SLUG_BASE,
    buildDefaultOrganizationSlug,
    getDefaultOrganizationMetadata,
    isLegacyPersonalOrganizationSlugForUser,
    isPersonalOrganizationMetadata,
} from './domain/organizations/personalOrganization';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;
type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: never;
};

import { env } from './lib/env';
import { validatePasswordPolicy } from '../shared/password-policy';

const PERSONAL_ORGANIZATION_MEMBER_CHECK_LIMIT = 1000;

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
        const organizationId = await ctx.db.insert('organization', {
            name: DEFAULT_ORGANIZATION_NAME,
            slug: buildDefaultOrganizationSlug(args.userId),
            createdAt: now,
            metadata: getDefaultOrganizationMetadata(),
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

        if (isPersonalOrganizationMetadata(organization.metadata)) {
            return true;
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

function throwPersonalOrganizationDeleteForbidden(): never {
    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.PERSONAL_ORG_DELETE_FORBIDDEN,
        message: 'Personal organization cannot be deleted.',
    });
}

function throwPersonalOrganizationUpdateRestricted(): never {
    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.PERSONAL_ORG_UPDATE_RESTRICTED,
        message: 'Personal organization slug and metadata cannot be changed.',
    });
}

const createAuthOptions = (ctx: GenericCtx): AuthOptions => ({
    baseURL: env.BETTER_AUTH_URL,
    user: {
        deleteUser: {
            enabled: true,
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
        before: createAuthMiddleware(async ctx => {
            const pathsWithStrongPassword = ['/sign-up/email', '/reset-password'];
            if (!pathsWithStrongPassword.includes(ctx.path)) {
                return;
            }

            const password =
                (ctx.body as { password?: unknown; newPassword?: unknown } | undefined)?.password ??
                (ctx.body as { newPassword?: unknown } | undefined)?.newPassword ??
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
        admin(),
        organization({
            invitationExpiresIn: 60 * 60 * 24 * 2,
            defaultRole: 'member',
            organizationHooks: {
                beforeDeleteOrganization: async ({ organization }) => {
                    if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                        throwPersonalOrganizationDeleteForbidden();
                    }
                },
                beforeUpdateOrganization: async ({ organization, member }) => {
                    if (!('slug' in organization) && !('metadata' in organization)) {
                        return;
                    }

                    if (await isProtectedDefaultOrganization(ctx, member.organizationId)) {
                        throwPersonalOrganizationUpdateRestricted();
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
});

export default defineAuth(ctx => createAuthOptions(ctx as GenericCtx));

export const getCurrentUser = query({
    args: {},
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        return await ctx.db.get('user', identity.userId);
    },
});

export const getCurrentOrganization = query({
    args: {},
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) return null;

        const userId = ctx.db.normalizeId('user', identity.userId);
        if (!userId) return null;

        const activeOrganizationId = await resolveSessionActiveOrganizationId(ctx);
        const membership = await resolveActiveMembership(ctx, userId, activeOrganizationId);

        return membership.organizationId;
    },
});
