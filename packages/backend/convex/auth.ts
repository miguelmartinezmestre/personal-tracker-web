import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { components } from './_generated/api';
import { DataModel } from './_generated/dataModel';
import { query, QueryCtx, MutationCtx } from './_generated/server';
import { betterAuth } from 'better-auth';
import { organization, admin } from 'better-auth/plugins';
import schema from './betterAuth/schema';
// import { sendEmail } from './email';

const siteUrl = process.env.SITE_URL;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof schema>(components.betterAuth, {
    local: {
        schema: schema,
    },
});

// Helper function to get authenticated user, with fallback for test environments
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
    try {
        const user = await authComponent.getAuthUser(ctx);
        if (user) return user;
    } catch {
        // Fallback: try to find user by identity subject (for test environments)
        try {
            const identity = await ctx.auth.getUserIdentity();
            if (identity && identity.subject) {
                const userId = identity.subject;
                // Search for user by userId
                const userRecord = await ctx.db
                    .query('user')
                    .withIndex('userId', q => q.eq('userId', userId))
                    .first();
                if (userRecord) {
                    return userRecord;
                }
            }
        } catch (e) {
            // Ignore errors in fallback
            console.error(e);
            console.log('No user found');
            return null;
        }
    }
}

export const createAuth = (
    ctx: GenericCtx<DataModel>,
    { optionsOnly } = { optionsOnly: false }
) => {
    return betterAuth({
        // disable logging when createAuth is called just to generate options.
        // this is not required, but there's a lot of noise in logs without it.
        logger: {
            disabled: optionsOnly,
        },
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            // Log password reset emails instead of sending
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            sendResetPassword: async ({ user, url }, _request) => {
                // void sendEmail({
                //     to: user.email,
                //     subject: 'Reset your password',
                //     text: `Click the link to reset your password: ${url}`,
                //     html: `<p>Click the link to reset your password:</p><p><a href="${url}">${url}</a></p>`,
                // }).catch(err => {
                //     console.error('[email] Failed to send reset password email:', err);
                // });
                console.log('Reset password email sent to', user.email);
            },
        },
        // Email verification configuration
        emailVerification: {
            // Log verification emails instead of sending
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            sendVerificationEmail: async ({ user, url }, _request) => {
                // void sendEmail({
                //     to: user.email,
                //     subject: 'Verify your email address',
                //     text: `Click the link to verify your email: ${url}`,
                //     html: `<p>Click the link to verify your email:</p><p><a href="${url}">${url}</a></p>`,
                // }).catch(err => {
                //     console.error('[email] Failed to send verification email:', err);
                // });
                console.log('Verification email sent to', user.email);
            },
        },
        // User email change configuration
        user: {
            deleteUser: {
                enabled: true,
            },
            changeEmail: {
                enabled: true,
                // Log email change verification emails instead of sending
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                sendChangeEmailVerification: async ({ user, newEmail, url }, _request) => {
                    // void sendEmail({
                    //     to: user.email,
                    //     subject: 'Approve email change',
                    //     text: `You requested to change your email to ${newEmail}. Approve it here: ${url}`,
                    //     html: `<p>You requested to change your email to <strong>${newEmail}</strong>.</p><p>Approve it here: <a href="${url}">${url}</a></p>`,
                    // }).catch(err => {
                    //     console.error('[email] Failed to send change email verification:', err);
                    // });
                    console.log('Change email verification email sent to', user.email);
                },
            },
        },
        plugins: [
            // The Convex plugin is required for Convex compatibility
            convex(),
            // Admin plugin for user management, roles, and permissions
            admin({
                // Define which roles are considered admin roles
                adminRoles: ['admin', 'ADMIN'],
                // Optional: Custom ban messages
                bannedUserMessage: 'Your account has been banned. Please contact support.',
                defaultBanReason: 'Violation of terms of service',
            }),
            // Organization plugin for teams/organizations management
            organization({
                schema: {
                    organization: {
                        additionalFields: {
                            description: {
                                type: 'string',
                                required: false,
                            },
                        },
                    },
                },
                // Log invitation emails instead of sending
                async sendInvitationEmail(data) {
                    const inviteLink = `${siteUrl}/accept-invitation/${data.id}`;
                    // void sendEmail({
                    //     to: data.email,
                    //     subject: `Invitation to join ${data.organization.name}`,
                    //     text: `You've been invited to join ${data.organization.name}. Click here: ${inviteLink}`,
                    //     html: `<p>You've been invited to join <strong>${data.organization.name}</strong>.</p><p><a href="${inviteLink}">Accept invitation</a></p>`,
                    // }).catch(err => {
                    //     console.error('[email] Failed to send organization invitation:', err);
                    // });
                    console.log('Organization invitation email sent to', data.email);
                },
            }),
        ],
    });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
// Note: This uses regular query, not queryWithRLS, so it doesn't have _capturedIdentity
// It relies on ctx.auth.getUserIdentity() working, which should work in test environments
export const getCurrentUser = query({
    args: {},
    handler: async ctx => {
        return await getAuthenticatedUser(ctx);
    },
});

export const isAuthenticated = query({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user) {
            throw new Error('Unauthenticated');
        }
        return user;
    },
});
