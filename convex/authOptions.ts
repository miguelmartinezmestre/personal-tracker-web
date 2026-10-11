import { APIError, createAuthMiddleware } from 'better-auth/api';
import { convex, type BetterAuthOptionsWithoutDatabase } from 'kitcn/auth';
import { admin, organization } from 'better-auth/plugins';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { authAuditTriggers } from './authAuditTriggers';
import authConfig from './auth.config';
import { ERROR_CODES } from './constants';
import { accountDeletionPlugin } from './accountDeletionPlugin';
import {
    buildInvitationEmail,
    buildPasswordResetEmail,
    buildVerificationEmail,
    getInvitationIdFromCallbackPath,
    platformAdminRoles,
    platformRoles,
    readAuthStringField,
    requireRunnableCtx,
    resolveEmailLocale,
    usesReservedPersonalOrganizationIdentity,
    validatePasswordPolicy,
    type EmailLocale,
    type GenericCtx,
} from './utils';
import { z } from 'zod';
import { getEnvs, isSetupSecretValid, SETUP_SECRET_HEADER } from './env';

export type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: typeof authAuditTriggers;
};

const registrationRequestBodySchema = z.object({
    email: z.string().optional(),
    callbackURL: z.string().optional(),
    password: z.string().optional(),
    newPassword: z.string().optional(),
});

function throwReservedPersonalOrganizationIdentity() {
    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.PERSONAL_ORG_UPDATE_RESTRICTED,
        message: 'Personal organization slug and metadata are reserved.',
    });
}

async function assertOrganizationNameAvailable(
    ctx: GenericCtx,
    userId: string,
    name: string,
    excludeOrganizationId?: string
) {
    const taken = await requireRunnableCtx(ctx).runQuery(internal.auth.userHasOrganizationNamed, {
        userId,
        name,
        ...(excludeOrganizationId ? { excludeOrganizationId } : {}),
    });
    if (taken) {
        throw new APIError('BAD_REQUEST', {
            code: ERROR_CODES.ORGANIZATION_NAME_TAKEN,
            message: 'You already belong to an organization with that name.',
        });
    }
}

async function isProtectedDefaultOrganization(ctx: GenericCtx, organizationId: string) {
    const runnableCtx = requireRunnableCtx(ctx);
    return await runnableCtx.runQuery(internal.auth.isDefaultOrganization, {
        organizationId,
    });
}

async function getEmailLocale(ctx: GenericCtx, request?: Request): Promise<EmailLocale> {
    const settings = await requireRunnableCtx(ctx).runQuery(
        api.setup.getPublicPlatformSettings,
        {}
    );
    return resolveEmailLocale(request, settings?.defaultLanguage);
}

function createPasswordHooks(ctx: GenericCtx) {
    return {
        sendResetPassword: async (
            { user, url }: { user: { email: string }; url: string },
            request?: Request
        ) => {
            await requireRunnableCtx(ctx).scheduler.runAfter(
                0,
                internal.email.sendTransactionalEmail,
                buildPasswordResetEmail({
                    to: user.email,
                    url,
                    locale: await getEmailLocale(ctx, request),
                })
            );
        },
        onPasswordReset: () => Promise.resolve(),
        sendVerificationEmail: async (
            { user, url }: { user: { email: string }; url: string },
            request?: Request
        ) => {
            await requireRunnableCtx(ctx).scheduler.runAfter(
                0,
                internal.email.sendTransactionalEmail,
                buildVerificationEmail({
                    to: user.email,
                    url,
                    locale: await getEmailLocale(ctx, request),
                })
            );
        },
    };
}

function createSessionCreateHook(ctx: GenericCtx) {
    return {
        before: async (session: { userId: string }) => {
            const activeOrganizationId = await requireRunnableCtx(ctx).runMutation(
                internal.auth.ensureDefaultOrganizationForUser,
                { userId: session.userId }
            );

            return {
                data: {
                    ...session,
                    activeOrganizationId,
                },
            };
        },
    };
}

function createRegistrationHook(ctx: GenericCtx) {
    return createAuthMiddleware(async authRequest => {
        const pathsWithStrongPassword = ['/sign-up/email', '/reset-password', '/change-password'];
        if (!pathsWithStrongPassword.includes(authRequest.path)) {
            return;
        }

        const parsedBody = registrationRequestBodySchema.safeParse(authRequest.body);
        const body = parsedBody.success ? parsedBody.data : undefined;
        if (authRequest.path === '/sign-up/email') {
            const email = readAuthStringField(body, 'email');
            const callbackURL = readAuthStringField(body, 'callbackURL');
            const invitationId = callbackURL ? getInvitationIdFromCallbackPath(callbackURL) : null;
            let authorization: string;
            if (email) {
                authorization = await requireRunnableCtx(ctx).runQuery(
                    internal.auth.getEmailRegistrationAuthorization,
                    {
                        email,
                        invitationId,
                        now: Date.now(),
                    }
                );
            } else {
                authorization = 'denied';
            }

            if (authorization === 'bootstrap') {
                const providedSetupSecret =
                    authRequest.headers?.get(SETUP_SECRET_HEADER) ??
                    authRequest.request?.headers.get(SETUP_SECRET_HEADER);

                if (!isSetupSecretValid(getEnvs().SETUP_SECRET, providedSetupSecret)) {
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
            readAuthStringField(body, 'password') ?? readAuthStringField(body, 'newPassword');
        const passwordPolicy = validatePasswordPolicy(password);
        if (!passwordPolicy.ok) {
            throw new APIError('BAD_REQUEST', {
                code: passwordPolicy.code,
                message: passwordPolicy.message,
            });
        }
    });
}

function createOrganizationPlugin(ctx: GenericCtx) {
    return organization({
        requireEmailVerificationOnInvitation: true,
        invitationExpiresIn: 60 * 60 * 24 * 2,
        defaultRole: 'member',
        organizationHooks: {
            beforeCreateOrganization: async ({ organization: newOrganization, user }) => {
                if (usesReservedPersonalOrganizationIdentity(newOrganization)) {
                    throwReservedPersonalOrganizationIdentity();
                }
                if (typeof newOrganization.name === 'string') {
                    await assertOrganizationNameAvailable(ctx, user.id, newOrganization.name);
                }
            },
            afterCreateOrganization: async ({ organization }) => {
                await requireRunnableCtx(ctx).runMutation(
                    internal.categories.seedDefaultCategories,
                    {
                        organizationId: organization.id,
                    }
                );
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
                const runnableCtx = requireRunnableCtx(ctx);
                await runnableCtx.runMutation(
                    internal.auth.recoverSessionsAfterOrganizationDeletion,
                    {
                        organizationId: organization.id,
                        actorUserId: user.id,
                        phase: 'actor-null',
                    }
                );
                await runnableCtx.runMutation(
                    internal.cascades.cascadeOrganizationDeletionInternal,
                    {
                        organizationId: organization.id as Id<'organization'>,
                    }
                );
            },
            beforeUpdateOrganization: async ({ organization, member, user }) => {
                if (typeof organization.name === 'string') {
                    await assertOrganizationNameAvailable(
                        ctx,
                        user.id,
                        organization.name,
                        member.organizationId
                    );
                }
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
        sendInvitationEmail: async ({ id, email, organization, inviter, role }, request) => {
            const inviterName = inviter.user.name;
            // The inviter's language: the invitee has no preference stored yet.
            const invitationEmail = buildInvitationEmail({
                siteUrl: getEnvs().SITE_URL,
                invitationId: id,
                inviteeEmail: email,
                organizationName: organization.name,
                inviterName: inviterName ? inviterName : inviter.user.email,
                role,
                locale: await getEmailLocale(ctx, request),
            });

            await requireRunnableCtx(ctx).scheduler.runAfter(
                0,
                internal.email.sendTransactionalEmail,
                invitationEmail
            );
        },
    });
}

export function buildBetterAuthOptions(ctx: GenericCtx): AuthOptions {
    const env = getEnvs();
    const passwordHooks = createPasswordHooks(ctx);

    return {
        baseURL: env.BETTER_AUTH_URL,
        advanced: {
            database: {
                generateId: false,
            },
        },
        user: {
            deleteUser: {
                enabled: false,
            },
        },
        emailAndPassword: {
            enabled: true,
            sendResetPassword: passwordHooks.sendResetPassword,
            onPasswordReset: passwordHooks.onPasswordReset,
            revokeSessionsOnPasswordReset: true,
        },
        emailVerification: {
            sendVerificationEmail: passwordHooks.sendVerificationEmail,
        },
        databaseHooks: {
            session: {
                create: createSessionCreateHook(ctx),
            },
        },
        hooks: {
            before: createRegistrationHook(ctx),
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
            createOrganizationPlugin(ctx),
        ],
        triggers: authAuditTriggers,
    };
}
