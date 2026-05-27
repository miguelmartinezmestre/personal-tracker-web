import { APIError, createAuthMiddleware } from 'better-auth/api';
import {
    convex,
    getAuthUserIdentity,
    getSession,
    type BetterAuthOptionsWithoutDatabase,
} from 'kitcn/auth';
import { internal } from './_generated/api';
import {
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

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;
type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: never;
};

import { env } from './lib/env';
import { validatePasswordPolicy } from '../shared/password-policy';
const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

const buildDefaultOrganizationSlug = (userId: string) => {
    const normalizedSuffix = userId
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(-12);
    return `${DEFAULT_ORGANIZATION_SLUG_BASE}-${normalizedSuffix || Date.now().toString(36)}`;
};

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
            metadata: null,
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
                    if (!('runMutation' in ctx)) {
                        return;
                    }

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
        let organizationId: string | null = null;

        const session = await getSession(ctx);
        organizationId = session?.activeOrganizationId ?? null;

        return organizationId;
    },
});
