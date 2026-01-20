import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { components } from './_generated/api';
import { DataModel } from './_generated/dataModel';
import { query } from './_generated/server';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { admin, organization } from 'better-auth/plugins';
import authConfig from './auth.config';
import authSchema from './betterAuth/schema';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const emailApiUrl = process.env.EMAIL_API_URL ?? 'http://localhost:3001';

// Only require email verification in production when email service is configured
const isProduction = process.env.NODE_ENV === 'production';
const requireEmailVerification: boolean = !!(isProduction && process.env.EMAIL_API_URL);

/**
 * Send organization invitation email via the email API
 */
async function sendOrganizationInvitationEmail(data: {
    to: string;
    organizationName: string;
    inviterName: string;
    inviterEmail: string;
    invitationLink: string;
}): Promise<void> {
    const url = `${emailApiUrl}/api/email/organization-invitation`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[sendOrganizationInvitationEmail] Failed to send email:', errorText);
        }
    } catch (error) {
        console.error('[sendOrganizationInvitationEmail] Error sending email:', error);
    }
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
    return {
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // Configure email/password with verification for security
        // Email verification is only required in production when email service is configured
        emailAndPassword: {
            enabled: true,
            requireEmailVerification,
        },
        plugins: [
            // The Convex plugin is required for Convex compatibility
            convex({ authConfig }),
            admin(),
            organization({
                // Invitations never expire
                invitationExpiry: false,
                // Default role for invited members
                defaultRole: 'member',
                // Configure custom email sending for invitations
                sendInvitationEmail: async data => {
                    const inviteLink = `${siteUrl}/invitations/${data.id}`;
                    console.log('[sendOrganizationInvitationEmail] Invite link:', inviteLink);
                    // await sendOrganizationInvitationEmail({
                    //     to: data.email,
                    //     organizationName: data.organization.name,
                    //     inviterName: data.inviter.user.name,
                    //     inviterEmail: data.inviter.user.email,
                    //     invitationLink: inviteLink,
                    // });
                },
            }),
        ],
    } satisfies BetterAuthOptions;
};

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
    local: {
        schema: authSchema,
    },
});

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth(createAuthOptions(ctx));
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
    args: {},
    handler: async ctx => {
        return ctx.auth.getUserIdentity().catch(() => null);
    },
});

// Check if user is authenticated
export const isAuthenticated = query({
    args: {},
    handler: async ctx => {
        const user = await ctx.auth.getUserIdentity().catch(() => null);
        if (user) return true;
        // Fall back to checking identity in tests
        const identity = await ctx.auth.getUserIdentity();
        const identityUserId = String(identity?.subject || '');
        return !!identityUserId;
    },
});
