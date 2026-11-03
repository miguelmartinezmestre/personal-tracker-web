import { APIError, createAuthMiddleware } from 'better-auth/api';
import { convex, type BetterAuthOptionsWithoutDatabase } from 'kitcn/auth';
import { admin, organization } from 'better-auth/plugins';
import { api, internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import { authAuditTriggers } from '../audit/triggers';
import authConfig from '../../auth.config';
import { ERROR_CODES } from '../../shared/errorCodes';
import { accountDeletionPlugin } from './accountDeletionPlugin';
import {
    buildInvitationEmail,
    buildPasswordResetEmail,
    buildVerificationEmail,
    normalizeInvitationEmail,
    resolveEmailLocale,
    type EmailLocale,
} from '../email/templates';
import { getInvitationIdFromCallbackPath } from './redirects';
import { isOrganizationRoleValue } from '../organizations/roles';
import { platformAdminRoles, platformRoles } from './roles';
import { requireRunnableCtx, type GenericCtx } from '../../shared/ctx';
import { usesReservedPersonalOrganizationIdentity } from '../organizations/personalOrganization';
import { validatePasswordPolicy } from './passwordPolicy';
import { z } from 'zod';
import { getEnvs } from '../../shared/env';
import { isSetupSecretValid, SETUP_SECRET_HEADER } from '../setup/secret';

export type AuthOptions = BetterAuthOptionsWithoutDatabase & {
    triggers: typeof authAuditTriggers;
};

const registrationRequestBodySchema = z.object({
    name: z.string().optional(),
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

function throwInvalidOrganizationRole() {
    throw new APIError('BAD_REQUEST', {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'A member has exactly one role: owner, admin or member.',
    });
}

function throwOrganizationNameTaken() {
    throw new APIError('BAD_REQUEST', {
        code: ERROR_CODES.ORGANIZATION_NAME_TAKEN,
        message: 'You already belong to an organization with that name.',
    });
}

async function isOrganizationNameAvailable(
    ctx: GenericCtx,
    userId: string,
    name: string,
    excludeOrganizationId?: string
): Promise<boolean> {
    const taken = await requireRunnableCtx(ctx).runQuery(internal.auth.userHasOrganizationNamed, {
        userId,
        name,
        excludeOrganizationId,
    });

    return !taken;
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

function rejectBlankName(path: string, name: string | undefined) {
    if (!['/sign-up/email', '/update-user'].includes(path) || name === undefined) {
        return;
    }

    if (!name.trim()) {
        throw new APIError('BAD_REQUEST', {
            code: ERROR_CODES.NAME_REQUIRED,
            message: 'The name cannot be empty.',
        });
    }
}

function createRegistrationHook(ctx: GenericCtx) {
    return createAuthMiddleware(async authRequest => {
        const pathsWithStrongPassword = ['/sign-up/email', '/reset-password', '/change-password'];
        const parsedBody = registrationRequestBodySchema.safeParse(authRequest.body);
        const body = parsedBody.success ? parsedBody.data : undefined;

        rejectBlankName(authRequest.path, body?.name);

        if (!pathsWithStrongPassword.includes(authRequest.path)) {
            return;
        }

        if (authRequest.path === '/sign-up/email') {
            const email = body?.email;
            const callbackURL = body?.callbackURL;
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

        const passwordPolicy = validatePasswordPolicy(body?.password ?? body?.newPassword);

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
        // Every invitation needs a verified email: otherwise anyone could sign up with the
        // invitee's address and join without owning that inbox.
        requireEmailVerificationOnInvitation: true,
        schema: {
            invitation: {
                additionalFields: {
                    requireEmailVerification: {
                        type: 'boolean',
                        required: false,
                        defaultValue: true,
                        input: false,
                    },
                },
            },
        },
        invitationExpiresIn: 60 * 60 * 24 * 2,
        defaultRole: 'member',
        organizationHooks: {
            beforeCreateOrganization: async ({ organization: newOrganization, user }) => {
                if (usesReservedPersonalOrganizationIdentity(newOrganization)) {
                    throwReservedPersonalOrganizationIdentity();
                }

                if (
                    newOrganization.name !== undefined &&
                    !(await isOrganizationNameAvailable(ctx, user.id, newOrganization.name))
                ) {
                    throwOrganizationNameTaken();
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
                if (
                    organization.name !== undefined &&
                    !(await isOrganizationNameAvailable(
                        ctx,
                        user.id,
                        organization.name,
                        member.organizationId
                    ))
                ) {
                    throwOrganizationNameTaken();
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
            beforeUpdateMemberRole: ({ newRole }) => {
                if (!isOrganizationRoleValue(newRole)) {
                    throwInvalidOrganizationRole();
                }

                return Promise.resolve();
            },
            beforeCreateInvitation: async ({ invitation, organization }) => {
                if (!isOrganizationRoleValue(invitation.role)) {
                    throwInvalidOrganizationRole();
                }

                const inviteeEmail = normalizeInvitationEmail(invitation.email);

                if (!inviteeEmail) {
                    throw new APIError('BAD_REQUEST', {
                        code: ERROR_CODES.VALIDATION_ERROR,
                        message: 'The invitation email address is not valid.',
                    });
                }

                if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                    throw new APIError('FORBIDDEN', {
                        code: ERROR_CODES.PERSONAL_ORG_INVITE_FORBIDDEN,
                        message: 'Personal organization cannot invite members.',
                    });
                }

                return {
                    data: {
                        email: inviteeEmail,
                    },
                };
            },
            beforeAcceptInvitation: async ({ organization, user }) => {
                if (await isProtectedDefaultOrganization(ctx, organization.id)) {
                    throw new APIError('FORBIDDEN', {
                        code: ERROR_CODES.PERSONAL_ORG_INVITE_FORBIDDEN,
                        message: 'Personal organization cannot invite members.',
                    });
                }

                if (!user.emailVerified) {
                    throw new APIError('FORBIDDEN', {
                        code: 'EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION',
                        message: 'Verify your email before accepting this invitation.',
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
            const inviteeEmail = normalizeInvitationEmail(email);

            if (!inviteeEmail) {
                throw new APIError('BAD_REQUEST', {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: 'The invitation email address is not valid.',
                });
            }

            const inviterName = inviter.user.name;

            const invitationEmail = buildInvitationEmail({
                siteUrl: getEnvs().SITE_URL,
                invitationId: id,
                inviteeEmail,
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
        session: {
            expiresIn: 7 * 24 * 60 * 60,
            updateAge: 24 * 60 * 60,
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
