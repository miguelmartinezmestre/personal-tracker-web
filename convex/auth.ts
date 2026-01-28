import { type GenericCtx, type Triggers, type AuthFunctions } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { internal } from './_generated/api';
import { DataModel } from './_generated/dataModel';
import { MutationCtx, query, QueryCtx } from './_generated/server';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { admin, organization } from 'better-auth/plugins';
import authConfig from './auth.config';
import schema from './schema';
import { createClient } from './betterAuth/create-client';
import { DocumentByName, GenericDataModel, GenericQueryCtx } from 'convex/server';
import { getSession } from 'better-auth/api';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const emailApiUrl = process.env.EMAIL_API_URL ?? 'http://localhost:3001';

// Only require email verification in production when email service is configured
const isProduction = process.env.NODE_ENV === 'production';
const requireEmailVerification: boolean = !!(isProduction && process.env.EMAIL_API_URL);

// Admin emails that get auto-assigned admin role
const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').filter(Boolean);

const authFunctions: AuthFunctions = internal.auth;

async function sendWelcomeEmail(data: { to: string; name: string }): Promise<void> {
    if (!process.env.EMAIL_API_URL) return;

    const url = `${emailApiUrl}/api/email/welcome`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[sendWelcomeEmail] Failed to send email:', errorText);
        }
    } catch (error) {
        console.error('[sendWelcomeEmail] Error sending email:', error);
    }
}

// Define triggers for auth lifecycle events
const triggers: Triggers<DataModel, typeof schema> = {
    user: {
        onCreate: async (ctx, user) => {
            console.log(`[auth] User created: ${user.email}`);

            // Create personal organization automatically
            const orgId = await ctx.db.insert('organization', {
                name: `${user.name}'s Workspace`,
                slug: `personal-${user._id}`,
                logo: null,
                metadata: null,
                createdAt: Date.now(),
            });

            // Add user as owner of their personal org
            await ctx.db.insert('member', {
                organizationId: orgId,
                userId: user._id,
                role: 'owner',
                createdAt: Date.now(),
            });

            console.log(`[auth] Created personal organization for user ${user.email}`);

            // Send welcome email (fire and forget)
            sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => { });
        },
    },
    session: {
        onCreate: async (ctx, session) => {
            // If the user has no active organization, assign their personal org
            if (!session.activeOrganizationId) {
                const member = await ctx.db
                    .query('member')
                    .withIndex('userId', (q) => q.eq('userId', session.userId))
                    .first();

                if (member) {
                    // Cast session._id to the correct type for patch
                    await ctx.db.patch(session._id as DataModel['session']['document']['_id'], {
                        activeOrganizationId: member.organizationId,
                    });
                    console.log(`[auth] Auto-assigned active organization for session`);
                }
            }
        },
    },
    member: {
        onCreate: async (_ctx, member) => {
            console.log(`[auth] Member ${member.userId} joined org ${member.organizationId} as ${member.role}`);
        },
    },
};

export const authClient = createClient<DataModel, typeof schema>({
    authFunctions,
    schema,
    triggers,
});

export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) =>
    betterAuth({
        ...createAuthOptions(ctx),
        database: authClient.adapter(ctx, createAuthOptions),
    });

export const createAuthOptions = (ctx: GenericCtx<DataModel>): BetterAuthOptions => {
    return {
        baseURL: siteUrl,
        database: authClient.httpAdapter(ctx),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification,
        },
        user: {
            // Auto-assign admin role to specific emails
            additionalFields: {
                role: {
                    type: 'string',
                    defaultValue: 'user',
                    input: false,
                },
            },
        },
        plugins: [
            convex({ authConfig }),
            admin(),
            organization({
                invitationExpiry: false,
                defaultRole: 'member',
                sendInvitationEmail: async data => {
                    const inviteLink = `${siteUrl}/invitations/${data.id}`;
                    console.log('[auth:sendInvitationEmail] Invite link:', inviteLink);
                },
            }),
        ],
        // Hook to auto-assign admin role during user creation
        databaseHooks: {
            user: {
                create: {
                    before: async (user) => {
                        if (adminEmails.includes(user.email)) {
                            return { data: { ...user, role: 'admin' } };
                        }
                        return { data: user };
                    },
                },
            },
        },
    };
};

// export const createAuth = (ctx: GenericCtx<DataModel>) => {
//     return betterAuth(createAuthOptions(ctx));
// };

// Export trigger handlers for the adapter to invoke
export const { onCreate, onUpdate, onDelete } = authClient.triggersApi();

export const getCurrentUser = query({
    args: {},
    handler: async ctx => {
        return ctx.auth.getUserIdentity().catch(() => null);
    },
});

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
