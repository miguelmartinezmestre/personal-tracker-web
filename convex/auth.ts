import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import {
    createApi,
    createClient,
    getAuthUserIdentity,
    getHeaders,
    type AuthFunctions,
} from 'better-convex/auth';
import { internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import {
    internalMutation,
    query,
    type ActionCtx,
    type MutationCtx,
    type QueryCtx,
} from './_generated/server';
import authConfig from './auth.config';
import schema from './schema';
import { admin, organization } from 'better-auth/plugins';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authAuditTriggers } from './authAuditTriggers';
import { ERROR_CODES } from './utils/constants';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;

import { env } from './lib/env';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

const buildDefaultOrganizationSlug = (userId: string) => {
    const normalizedSuffix = userId
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(-12);
    return `${DEFAULT_ORGANIZATION_SLUG_BASE}-${normalizedSuffix || Date.now().toString(36)}`;
};

interface AuthSession {
    session?: {
        activeOrganizationId?: string | null;
    };
}

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
            return existingMembership.organizationId as Id<'organization'>;
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

const authFunctions: AuthFunctions = internal.auth;

export const authClient = createClient<DataModel, typeof schema>({
    authFunctions,
    schema,
    internalMutation,
    triggers: authAuditTriggers,
});

const createAuthOptions = (ctx: GenericCtx): BetterAuthOptions => ({
    baseURL: env.SITE_URL,
    user: {
        deleteUser: {
            enabled: true,
        },
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }, _request) => {
            await (ctx as MutationCtx).runMutation(internal.email.sendTestEmail, {
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

                    const activeOrganizationId: Id<'organization'> = await (
                        ctx as RunnableCtx
                    ).runMutation(internal.auth.ensureDefaultOrganizationForUser, {
                        userId: session.userId as Id<'user'>,
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
            if (ctx.path !== '/sign-up/email') {
                return;
            }

            const password =
                (ctx.body as { password?: unknown } | undefined)?.password ?? undefined;

            if (typeof password !== 'string' || password.length < 8) {
                return;
            }

            if (!STRONG_PASSWORD_REGEX.test(password)) {
                throw new APIError('BAD_REQUEST', {
                    code: ERROR_CODES.WEAK_PASSWORD,
                    message:
                        'Password must include at least one uppercase letter, one lowercase letter, and one number',
                });
            }
        }),
    },
    plugins: [
        convex({
            authConfig,
            jwks: process.env.JWKS,
        }),
        admin(),
        organization({
            invitationExpiresIn: 60 * 60 * 24 * 2,
            defaultRole: 'member',
            sendInvitationEmail: async () => {},
        }),
    ],
    database: authClient.httpAdapter(ctx),
});
export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) =>
    betterAuth({
        ...createAuthOptions(ctx),
        database: authClient.adapter(ctx, createAuthOptions),
    });
export const createAuth = (ctx: ActionCtx) => betterAuth(createAuthOptions(ctx));
export const {
    create,
    deleteMany,
    deleteOne,
    findMany,
    findOne,
    updateMany,
    updateOne,
    getLatestJwks,
    rotateKeys,
} = createApi(schema, createAuth, {
    internalMutation,
});

export const { beforeCreate, beforeDelete, beforeUpdate, onCreate, onDelete, onUpdate } =
    authClient.triggersApi();

export const auth = betterAuth(createAuthOptions({} as GenericCtx));

export const getCurrentUser = query({
    args: v.object({}),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        return await ctx.db.get('user', identity.userId);
    },
});

export const getCurrentOrganization = query({
    args: v.object({}),
    handler: async ctx => {
        let organizationId: string | null = null;

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        const session = await auth.api.getSession({
            headers,
        });

        const authSession = session as AuthSession | null;
        organizationId = authSession?.session?.activeOrganizationId ?? null;

        return organizationId;
    },
});
