import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import schema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: {
      schema: schema,
    },
  }
);

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
          .query("user")
          .withIndex("userId", (q) => q.eq("userId", userId))
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
  { optionsOnly } = { optionsOnly: false },
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
      sendResetPassword: async ({ user, url, token }, request) => {
        console.log('='.repeat(80));
        console.log('📧 PASSWORD RESET EMAIL WOULD BE SENT:');
        console.log('To:', user.email);
        console.log('Subject: Reset your password');
        console.log('Reset URL:', url);
        console.log('Token:', token);
        console.log('='.repeat(80));
        // Uncomment to actually send email:
        // await sendEmail({ to: user.email, subject: 'Reset your password', text: `Click here to reset: ${url}` });
      },
    },
    // Email verification configuration
    emailVerification: {
      // Log verification emails instead of sending
      sendVerificationEmail: async ({ user, url, token }, request) => {
        console.log('='.repeat(80));
        console.log('📧 EMAIL VERIFICATION WOULD BE SENT:');
        console.log('To:', user.email);
        console.log('Subject: Verify your email address');
        console.log('Verification URL:', url);
        console.log('Token:', token);
        console.log('='.repeat(80));
        // Uncomment to actually send email:
        // await sendEmail({ to: user.email, subject: 'Verify your email', text: `Click here to verify: ${url}` });
      },
    },
    // User email change configuration
    user: {
      changeEmail: {
        enabled: true,
        // Log email change verification emails instead of sending
        sendChangeEmailVerification: async ({ user, newEmail, url, token }, request) => {
          console.log('='.repeat(80));
          console.log('📧 EMAIL CHANGE VERIFICATION WOULD BE SENT:');
          console.log('To:', user.email);
          console.log('New Email:', newEmail);
          console.log('Subject: Approve email change');
          console.log('Verification URL:', url);
          console.log('Token:', token);
          console.log('='.repeat(80));
          // Uncomment to actually send email:
          // await sendEmail({ to: user.email, subject: 'Approve email change', text: `Click here to approve: ${url}` });
        },
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
      // Admin plugin for user management, roles, and permissions
      admin({
        // Define which roles are considered admin roles
        adminRoles: ["admin", "ADMIN"],
        // Optional: Custom ban messages
        bannedUserMessage: "Your account has been banned. Please contact support.",
        defaultBanReason: "Violation of terms of service",
      }),
      // Organization plugin for teams/organizations management
      organization({
        schema: {
          organization: {
            additionalFields: {
              description: {
                type: "string",
                required: false,
              },
            },
          },
        },
        // Log invitation emails instead of sending
        async sendInvitationEmail(data) {
          const inviteLink = `${siteUrl}/accept-invitation/${data.id}`;
          console.log('='.repeat(80));
          console.log('📧 ORGANIZATION INVITATION EMAIL WOULD BE SENT:');
          console.log('To:', data.email);
          console.log('Subject: Invitation to join organization');
          console.log('Organization:', data.organization.name);
          console.log('Role:', data.role);
          console.log('Invited by:', data.inviter.user.name || data.inviter.user.email);
          console.log('Invitation ID:', data.id);
          console.log('Invitation Link:', inviteLink);
          console.log('='.repeat(80));
          // Uncomment to actually send email:
          // await sendEmail({ to: data.email, subject: 'Organization invitation', text: `You've been invited to join ${data.organization.name}. Click here: ${inviteLink}` });
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
  handler: async (ctx) => {
    return await getAuthenticatedUser(ctx);
  },
});

export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new Error("Unauthenticated");
    }
    return user;
  },
});