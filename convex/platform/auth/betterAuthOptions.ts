import { APIError, createAuthMiddleware } from 'better-auth/api';
import { convex, type BetterAuthOptionsWithoutDatabase } from 'kitcn/auth';
import { admin, organization } from 'better-auth/plugins';
import { internal } from '../../_generated/api';
import { authAuditTriggers } from '../../authAuditTriggers';
import authConfig from '../../auth.config';
import { ERROR_CODES } from '../../utils/constants';
import { env } from '../../lib/env';
import { validatePasswordPolicy } from '../../../shared/password-policy';
import { platformAdminRoles, platformRoles } from '../../../shared/platform-admin-access';
import {
    getInvitationIdFromCallbackPath,
    isSetupSecretValid,
    ORGANIZATION_SECURITY_OPTIONS,
    SETUP_SECRET_HEADER,
} from '../../../shared/auth-security';
import { buildInvitationEmail } from '../email/invitationEmail';
import { accountDeletionPlugin } from './accountDeletionPlugin';
import {
    readAuthStringField,
    requireRunnableCtx,
    usesReservedPersonalOrganizationIdentity,
    type GenericCtx,
} from './authRuntime';
import { isJsonObject } from '../../../shared/boundary-values';

export type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: typeof authAuditTriggers;
};

function throwReservedPersonalOrganizationIdentity() {
    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.PERSONAL_ORG_UPDATE_RESTRICTED,
        message: 'Personal organization slug and metadata are reserved.',
    });
}

async function isProtectedDefaultOrganization(ctx: GenericCtx, organizationId: string) {
    const runnableCtx = requireRunnableCtx(ctx);
    return await runnableCtx.runQuery(internal.auth.isDefaultOrganization, {
        organizationId,
    });
}

function createPasswordHooks(ctx: GenericCtx) {
    return {
        sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
            await requireRunnableCtx(ctx).runMutation(internal.email.sendTransactionalEmail, {
                to: user.email,
                subject: 'Reset your password',
                text: `Click the link to reset your password: ${url}`,
            });
        },
        onPasswordReset: () => Promise.resolve(),
        sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
            await requireRunnableCtx(ctx).runMutation(internal.email.sendTransactionalEmail, {
                to: user.email,
                subject: 'Verify your email address',
                text: `Click the link to verify your email address: ${url}`,
            });
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

        const body = isJsonObject(authRequest.body) ? authRequest.body : undefined;
        if (authRequest.path === '/sign-up/email') {
            const email = readAuthStringField(body, 'email');
            const callbackURL = readAuthStringField(body, 'callbackURL');
            const invitationId = callbackURL ? getInvitationIdFromCallbackPath(callbackURL) : null;
            const authorization = email
                ? await requireRunnableCtx(ctx).runQuery(
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
        ...ORGANIZATION_SECURITY_OPTIONS,
        invitationExpiresIn: 60 * 60 * 24 * 2,
        defaultRole: 'member',
        organizationHooks: {
            beforeCreateOrganization: ({ organization: newOrganization }) => {
                if (usesReservedPersonalOrganizationIdentity(newOrganization)) {
                    throwReservedPersonalOrganizationIdentity();
                }
                return Promise.resolve();
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
                await runnableCtx.runMutation(internal.admin.cascadeOrganizationDeletionInternal, {
                    organizationId: organization.id,
                });
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
            const inviterName = inviter.user.name;
            const invitationEmail = buildInvitationEmail({
                siteUrl: env.SITE_URL,
                invitationId: id,
                inviteeEmail: email,
                organizationName: organization.name,
                inviterName: inviterName ? inviterName : inviter.user.email,
                role,
            });

            await requireRunnableCtx(ctx).runMutation(
                internal.email.sendTransactionalEmail,
                invitationEmail
            );
        },
    });
}

export function buildBetterAuthOptions(ctx: GenericCtx): AuthOptions {
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
