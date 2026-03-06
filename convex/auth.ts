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

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const STRONG_PASSWORD_MESSAGE =
    'La contraseña debe incluir al menos una mayúscula, una minúscula y un número';
const DEFAULT_ORGANIZATION_NAME = 'Personal Organization';
const DEFAULT_ORGANIZATION_SLUG_BASE = 'personal-organization';

const buildDefaultOrganizationSlug = (userId: string) => {
    const normalizedSuffix = userId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
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
    internalMutation, // Optional: custom mutation wrapper for triggers
    triggers: {},
});

// Auth options factory
const createAuthOptions = (ctx: GenericCtx): BetterAuthOptions => ({
        baseURL: process.env.SITE_URL!,
        user: {
            deleteUser: {
                enabled: true,
            },
        },
        emailAndPassword: {
            enabled: true,
            sendResetPassword: async ({ user, url, token }, _request) => {
                console.log(
                    `Sending reset password email to ${user.email} with url ${url} and token ${token}`
                );
                await (ctx as MutationCtx).runMutation(internal.email.sendTestEmail, {
                    to: user.email,
                    subject: 'Reset your password',
                    text: `Click the link to reset your password: ${url}`,
                });
            },
            onPasswordReset: async ({ user }, _request) => {
                console.log(`Password for user ${user.email} has been reset.`);
            },
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
                        ).runMutation(
                            internal.auth.ensureDefaultOrganizationForUser,
                            {
                                userId: session.userId as Id<'user'>,
                            }
                        );

                        return {
                            data: {
                                ...session,
                                activeOrganizationId: activeOrganizationId as string,
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
                        message: STRONG_PASSWORD_MESSAGE,
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
                sendInvitationEmail: async data => {
                    const inviteLink = `${siteUrl}/invitations/${data.id}`;
                    console.log('[auth:sendInvitationEmail] Invite link:', inviteLink);
                },
            }),
        ],
        database: authClient.httpAdapter(ctx),
    });
// For queries/mutations: direct DB access
export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) =>
    betterAuth({
        ...createAuthOptions(ctx),
        database: authClient.adapter(ctx, createAuthOptions),
    });
// For actions/HTTP routes: HTTP adapter
export const createAuth = (ctx: ActionCtx) => betterAuth(createAuthOptions(ctx));
// Generate internal CRUD functions
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
    internalMutation, // Optional: same wrapper as createClient
});
// Generate trigger handlers
export const { beforeCreate, beforeDelete, beforeUpdate, onCreate, onDelete, onUpdate } =
    authClient.triggersApi();
// Export for Better Auth CLI
// biome-ignore lint/suspicious/noExplicitAny: Required for CLI
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for BetterAuth CLI
export const auth = betterAuth(createAuthOptions({} as any));

export const getCurrentUser = query({
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) throw new ConvexError('Unauthenticated');
        return await ctx.db.get('user', identity.userId);
    },
});

export const getCurrentOrganization = query({
    handler: async ctx => {
        let organizationId: string | null = null;

        const headers = await getHeaders(ctx);
        const auth = getAuth(ctx);

        const session = await auth.api.getSession({
            headers,
        });

        organizationId =
            ((session?.session as { activeOrganizationId?: string | null } | undefined)
                ?.activeOrganizationId as string | null | undefined) ?? null;

        return organizationId;
    },
});
